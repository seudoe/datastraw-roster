# RosterIQ Mathematical Scheduling Model (CP-SAT v1.0)

## 1. Mathematical Formulation

RosterIQ formulates shift scheduling as a Mixed Integer Programming (MIP) / Constraint Programming problem solved with **Google OR-Tools CP-SAT 9.15**.

### 1.1 Sets and Indices
- $E$: Set of active employees, indexed by $e \in \{1, \dots, N\}$.
- $B$: Set of active brands, indexed by $b \in \{1, \dots, M\}$.
- $P$: Set of brand operating processes, indexed by $p \in \{1, \dots, K\}$. Each process $p$ belongs to brand $brand(p)$ and has SLA priority $priority(p) \in \{1, 2, 3\}$.
- $D$: Set of discrete calendar days in the planning month, indexed by $d \in \{0, \dots, T-1\}$.
- $Q(e) \subseteq P$: Set of processes employee $e$ is qualified to execute (via PRIMARY, BACKUP, or TEMPORARY assignment).
- $Q^{-1}(p) \subseteq E$: Set of employees qualified to execute process $p$.

### 1.2 Decision Variables
- **Assignment Variable:**
  $$x_{e, p, d} \in \{0, 1\} \quad \forall e \in E, p \in Q(e), d \in D$$
  Equals $1$ if employee $e$ is assigned to operate process $p$ on date $d$; $0$ otherwise.

- **Daily Working Indicator:**
  $$w_{e, d} \in \{0, 1\} \quad \forall e \in E, d \in D$$
  Equals $1$ if employee $e$ works any process on date $d$; $0$ if taking weekly off, leave, or holiday.
  $$w_{e, d} = \sum_{p \in Q(e)} x_{e, p, d}$$

- **Soft Coverage Slack (Unfilled Seats):**
  $$gap_{p, d} \in [0, demand(p, d)] \cap \mathbb{Z} \quad \forall p \in P, d \in D$$
  Quantifies understaffing deficit when demand cannot be physically satisfied.

- **Weekly Off Deficit:**
  $$deficit_e \in [0, T] \cap \mathbb{Z} \quad \forall e \in E$$
  Quantifies shortfall if employee cannot be granted their prorated weekly off target.

---

## 2. Hard Constraints

### 2.1 Single Assignment per Day
An employee cannot be double-booked across multiple processes on the same date:
$$\sum_{p \in Q(e)} x_{e, p, d} \le 1 \quad \forall e \in E, d \in D$$

### 2.2 Forced Absence & Holiday States
If employee $e$ has an approved absence or mandatory closure on date $d$ ($status \neq \text{WORK}$):
$$w_{e, d} = 0 \quad \forall (e, d) \in \text{Forced}$$

### 2.3 Manual Supervisor Cell Locks
If a cell $(e, d)$ is explicitly locked by an Operations Manager:
$$w_{e, d} = 1 \quad \text{if } status = \text{WORK}$$
$$x_{e, p_{lock}, d} = 1 \quad \text{if process specified}$$
$$w_{e, d} = 0 \quad \text{if } status \neq \text{WORK}$$

### 2.4 Rolling Window Max Consecutive Work Days
To guarantee mandatory rest and prevent agent burnout, in every sliding window of length $W = maxConsecutiveWorkDays + 1$ (default $6 + 1 = 7$ days), an employee must take at least 1 day of rest:
$$\sum_{k=0}^{maxConsecutive} w_{e, d+k} \le maxConsecutive \quad \forall e \in E, d \in \{0, \dots, T - maxConsecutive - 1\}$$

### 2.5 Coverage Balance with Slack
Demand on process $p$ on date $d$ must be satisfied by assigned workers plus slack:
$$\sum_{e \in Q^{-1}(p)} x_{e, p, d} + gap_{p, d} = demand(p, d) \quad \forall p \in P, d \in D$$
$$\sum_{e \in Q^{-1}(p)} x_{e, p, d} \le demand(p, d) \quad \forall p \in P, d \in D$$

---

## 3. Objective Function & Multi-Objective Weights

The CP-SAT model optimizes a multi-objective cost function:

$$\min \quad Z = Z_{gap} + Z_{pref} + Z_{backup} + Z_{off} + Z_{repair}$$

Where:

1. **Unfilled Demand Penalty ($Z_{gap}$):**
   Scales linearly with the brand's SLA priority (1 = Standard, 2 = Elevated, 3 = Critical SLA).
   $$Z_{gap} = \sum_{p \in P} \sum_{d \in D} \left( W_{gap} \times priority(p) \right) \times gap_{p, d}$$

2. **Preferred Off Violation Penalty ($Z_{pref}$):**
   Penalizes scheduling an employee to work on their preferred off days (e.g., Saturday/Sunday).
   $$Z_{pref} = \sum_{e \in E} \sum_{d \in D : weekday(d) \in pref(e)} W_{pref} \times w_{e, d}$$

3. **Backup Floater Activation Penalty ($Z_{backup}$):**
   Incentivizes scheduling primary process owners first before pulling in cross-trained floaters.
   $$Z_{backup} = \sum_{(e, p) \in \text{BACKUP}} \sum_{d \in D} W_{backup} \times x_{e, p, d}$$

4. **Weekly Off Shortfall Penalty ($Z_{off}$):**
   Soft penalty ensuring employees receive their targeted number of rest days.
   $$Z_{off} = \sum_{e \in E} W_{off} \times deficit_e$$

5. **Minimal Disruption Penalty ($Z_{repair}$):**
   Employed exclusively during `/v1/repair` to penalize flipping cells away from a published baseline.
   $$Z_{repair} = \sum_{(e, d)} W_{disruption} \times |w_{e, d} - w_{e, d}^{base}|$$

---

## 4. Weight Profiles

| Profile | $W_{gap}$ (Priority 1..3) | $W_{pref}$ | $W_{backup}$ | $W_{off}$ | Business Goal |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **BALANCED** | $100{,}000 \times priority$ | $100$ | $30$ | $1{,}000$ | Default operational trade-off balancing SLA fulfillment with agent rest. |
| **COVERAGE_FIRST** | $500{,}000 \times priority$ | $20$ | $10$ | $500$ | Peak sale periods / festive surges where missing client coverage is unacceptable. |
| **FAIRNESS_FIRST** | $100{,}000 \times priority$ | $100$ | $20$ | $5{,}000$ | Enforces equitable distribution of weekend shifts and rest across the pod. |
| **PREFERENCE_FIRST** | $100{,}000 \times priority$ | $1{,}500$ | $50$ | $1{,}000$ | Low-demand periods maximizing agent schedule satisfaction and retention. |

---

## 5. Performance & Scaling Architecture

### 5.1 Graph Connected Components Decomposition
For enterprise scale (hundreds of employees and brands), RosterIQ implements bipartite graph decomposition in `solver/app/components.py`:
- Vertices: Employees $E$ and Processes $P$.
- Edges: Qualification assignments.
- Property: If Pod 1 and Pod 2 share zero cross-trained floaters, they decompose into independent connected components $\mathcal{C}_1, \mathcal{C}_2, \dots, \mathcal{C}_k$.
- Benefit: Reduces exponential MIP search space from $O(2^{N \times T})$ into $k$ independent sub-problems of size $O(2^{(N/k) \times T})$, allowing instantaneous parallel solves.

### 5.2 Determinism Guarantees
- Single-threaded solver parameter: `solver.parameters.num_workers = 1`.
- Deterministic random seed: `solver.parameters.random_seed = request.seed`.
- Sorted variable creation order eliminates non-deterministic hash iteration in Python dictionaries.
- **Guarantee:** Given identical input parameters, two consecutive solver runs will produce bit-for-bit identical schedules and objective values.
