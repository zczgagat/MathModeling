# NumPy 在数学建模竞赛中的常用代码

NumPy 是 Python 数值计算的基础。比赛中常用它表示向量、矩阵和多维数组，完成批量运算、线性代数、随机模拟、距离计算和结果保存。能用数组运算解决的问题，应优先避免逐元素编写 Python 循环。

## 1. 导入与数组检查

```python
import numpy as np

X = np.array([[1, 2, 3],
              [4, 5, 6]], dtype=float)

print(X.shape)   # (2, 3)：2 行 3 列
print(X.ndim)    # 2：二维数组
print(X.size)    # 6：元素总数
print(X.dtype)   # float64
```

建模前应先确认数组形状和数据类型。很多错误并不是公式有问题，而是行列方向或整数、浮点类型不符合预期。

## 2. 创建常用数组

```python
a = np.array([1, 2, 3], dtype=float)
sequence = np.arange(0, 10, 2)       # [0, 2, 4, 6, 8]
grid = np.linspace(0, 1, 101)        # 0 到 1 的 101 个等距点

zeros = np.zeros((3, 4))
ones = np.ones((3, 4))
constant = np.full((3, 4), 5.0)
identity = np.eye(4)

X_float = X.astype(float)
```

- `arange` 更适合指定步长；
- `linspace` 更适合绘制函数曲线或进行参数扫描；
- 参与除法、标准化和线性代数的数组通常应转为浮点数。

## 3. 索引、切片与条件筛选

```python
first_row = X[0, :]
first_column = X[:, 0]
sub_matrix = X[:2, 1:3]

mask = X[:, 0] >= 3
selected_rows = X[mask]

# 满足条件时取原值，否则取 0
nonnegative = np.where(X > 0, X, 0)

# 修改副本，不影响原数组
X_copy = X.copy()
X_copy[X_copy < 3] = np.nan
```

切片有时返回原数组的视图，修改后可能影响原数据。需要独立结果时显式调用 `copy()`。

## 4. 形状变换与数组拼接

```python
a = np.arange(12)
matrix = a.reshape(3, 4)
column = a.reshape(-1, 1)
flat = matrix.ravel()

A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])

vertical = np.vstack([A, B])          # 按行拼接
horizontal = np.hstack([A, B])        # 按列拼接
stacked = np.concatenate([A, B], axis=0)
```

`reshape(-1, 1)` 常用于把一维特征转换成机器学习模型需要的二维列向量。

## 5. 向量化、广播与矩阵乘法

```python
X = np.array([[80, 10, 2],
              [90, 12, 3],
              [70,  8, 4]], dtype=float)
weights = np.array([0.5, 0.3, 0.2])

# 每个方案的加权得分
scores = X @ weights

# 每列中心化，keepdims 保持 (1, p) 形状
centered = X - X.mean(axis=0, keepdims=True)

# 每列乘以不同系数，weights 会沿行方向广播
weighted_X = X * weights
```

设 `X` 的形状为 `(n, p)`：

- `axis=0` 表示沿行聚合，得到每一列的统计量；
- `axis=1` 表示沿列聚合，得到每一行的统计量；
- `@` 或 `np.matmul` 表示矩阵乘法，`*` 表示逐元素乘法。

## 6. 描述统计与缺失值

```python
data = np.array([1.0, 2.0, np.nan, 5.0, 100.0])

valid = np.isfinite(data)
clean = data[valid]

mean = np.nanmean(data)
median = np.nanmedian(data)
std = np.nanstd(data, ddof=1)         # 样本标准差
q1, q3 = np.nanquantile(data, [0.25, 0.75])

column_mean = np.nanmean(X, axis=0)
column_min = np.nanmin(X, axis=0)
column_max = np.nanmax(X, axis=0)
```

检测 IQR 异常值：

```python
q1, q3 = np.quantile(clean, [0.25, 0.75])
iqr = q3 - q1
lower = q1 - 1.5 * iqr
upper = q3 + 1.5 * iqr
outlier_mask = (clean < lower) | (clean > upper)
outliers = clean[outlier_mask]
```

检测到异常值后应先判断其业务含义，不要自动全部删除。

## 7. 标准化与指标正向化

Z-score 标准化：

```python
eps = 1e-12
mean = X.mean(axis=0, keepdims=True)
std = X.std(axis=0, ddof=0, keepdims=True)
X_zscore = (X - mean) / np.maximum(std, eps)
```

Min-Max 标准化：

```python
x_min = X.min(axis=0, keepdims=True)
x_max = X.max(axis=0, keepdims=True)
X_minmax = (X - x_min) / np.maximum(x_max - x_min, eps)
```

成本型指标正向化：

```python
cost = np.array([12.0, 8.0, 15.0, 10.0])
cost_positive = (cost.max() - cost) / max(cost.max() - cost.min(), eps)
```

用于训练、验证和测试的数据不能分别独立计算标准化参数。正式建模时只在训练集估计均值、标准差或极值，再应用到其他数据。

## 8. 排序、去重与位置查找

```python
values = np.array([3.2, 1.5, 3.2, 8.0])

order = np.argsort(values)             # 从小到大的下标
descending = np.argsort(values)[::-1]
best_index = np.argmax(values)
worst_index = np.argmin(values)

unique_values, counts = np.unique(values, return_counts=True)
top_two_indices = np.argpartition(values, -2)[-2:]
```

评价模型中常用 `argsort` 生成方案排名，优化和仿真中常用 `argmin`、`argmax` 定位最优方案。

## 9. 距离矩阵

计算样本到多个中心的欧氏距离：

```python
points = np.array([[0, 0], [1, 1], [3, 4]], dtype=float)
centers = np.array([[0, 0], [2, 2]], dtype=float)

diff = points[:, None, :] - centers[None, :, :]
distance_matrix = np.linalg.norm(diff, axis=2)
nearest_center = np.argmin(distance_matrix, axis=1)
```

两两距离可用于聚类、选址、路径规划和空间分析。样本规模很大时，完整距离矩阵会占用大量内存，应分块计算或使用 SciPy、scikit-learn 的专用函数。

## 10. 线性代数

解线性方程组：

```python
A = np.array([[3.0, 1.0],
              [1.0, 2.0]])
b = np.array([9.0, 8.0])

x = np.linalg.solve(A, b)
residual = A @ x - b
print(np.linalg.norm(residual))
```

最小二乘回归：

```python
x_data = np.array([1, 2, 3, 4], dtype=float)
y_data = np.array([2.2, 3.9, 6.1, 8.2], dtype=float)

design = np.column_stack([np.ones_like(x_data), x_data])
coef, residuals, rank, singular_values = np.linalg.lstsq(
    design, y_data, rcond=None
)
y_pred = design @ coef
```

特征值、矩阵秩和条件数：

```python
eigenvalues, eigenvectors = np.linalg.eig(A)
rank = np.linalg.matrix_rank(A)
condition_number = np.linalg.cond(A)
```

- 解方程优先使用 `solve`，最小二乘优先使用 `lstsq`；
- 不要为了计算 `A^{-1}b` 而显式调用 `inv(A)`；
- 条件数很大表示结果可能对微小扰动敏感，应检查共线性、尺度或模型设定。

## 11. 随机模拟与蒙特卡洛

使用新的随机数生成器接口：

```python
rng = np.random.default_rng(42)

normal_samples = rng.normal(loc=100, scale=15, size=10_000)
uniform_samples = rng.uniform(0, 1, size=10_000)
integers = rng.integers(0, 10, size=100)
permutation = rng.permutation(20)
```

蒙特卡洛估计事件概率：

```python
rng = np.random.default_rng(42)
demand = rng.normal(loc=100, scale=15, size=100_000)
capacity = 125
shortage_probability = np.mean(demand > capacity)
confidence_interval = np.quantile(demand, [0.025, 0.975])
```

调试时固定种子；正式实验应运行多个种子，并报告均值、标准差或置信区间。

## 12. 数值差分与积分

```python
t = np.linspace(0, 10, 501)
y = np.sin(t)

derivative = np.gradient(y, t)
integral = np.trapezoid(y, t)
```

`gradient` 可近似变化率，`trapezoid` 可计算曲线下面积。高精度微分方程、积分或优化问题应进一步使用 SciPy。

## 13. 保存与读取数组

```python
np.save("solution.npy", X)
X_loaded = np.load("solution.npy")

np.savez(
    "experiment.npz",
    solution=X,
    scores=scores,
    weights=weights,
)
result = np.load("experiment.npz")

np.savetxt("scores.csv", scores, delimiter=",", fmt="%.6f")
```

`npy` 和 `npz` 能保留形状与数据类型，适合程序中间结果；需要与 Excel 或论文表格交接时通常使用 Pandas 导出。

## 14. 赛场常用检查模板

```python
def check_numeric_array(name, array, *, ndim=None):
    array = np.asarray(array, dtype=float)
    if ndim is not None and array.ndim != ndim:
        raise ValueError(f"{name} 应为 {ndim} 维，实际为 {array.ndim} 维")
    if array.size == 0:
        raise ValueError(f"{name} 不能为空")
    if not np.isfinite(array).all():
        raise ValueError(f"{name} 含 NaN 或无穷值")
    return array


X = check_numeric_array("X", X, ndim=2)
print({
    "shape": X.shape,
    "min": X.min(axis=0),
    "max": X.max(axis=0),
    "mean": X.mean(axis=0),
})
```

## 15. 常见错误

- 混淆 `*` 与矩阵乘法 `@`；
- 混淆 `axis=0` 和 `axis=1`；
- 整数数组存入 `NaN` 或参与除法时出现类型问题；
- 对切片直接修改，意外改变原始数组；
- 标准化时分母为零；
- 使用全量数据估计标准化参数，造成数据泄漏；
- 显式求逆或忽略病态矩阵；
- 为大型样本一次性构造完整距离矩阵；
- 随机实验只运行一次或只汇报最好结果。

比赛中应在关键步骤打印数组形状、取值范围和缺失情况，并用小规模手算样例验证公式方向与下标。
