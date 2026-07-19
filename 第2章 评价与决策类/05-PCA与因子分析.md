# 主成分分析 PCA 与因子分析

## 1. 定义

主成分分析（Principal Component Analysis，PCA）通过原始变量的线性组合构造少量互不相关的主成分，在尽量保留总体方差的同时降低维度。

因子分析假设多个观测变量受到少数不可直接观测的公共因子影响，目标是解释变量之间的相关结构。

二者都能降维，但关注点不同：PCA重在数据压缩与方差保留，因子分析重在解释潜在结构。

## 2. PCA数学原理

设标准化后的数据矩阵为 \(Z\)，协方差矩阵或相关系数矩阵为：

$$
R=\frac{1}{n-1}Z^TZ.
$$

特征分解：

$$
R\boldsymbol a_k=\lambda_k\boldsymbol a_k,
\qquad \lambda_1\ge\lambda_2\ge\cdots\ge\lambda_p.
$$

第 \(k\) 个主成分为：

$$
F_k=\boldsymbol a_k^T\boldsymbol z.
$$

其方差贡献率为：

$$
\eta_k=\frac{\lambda_k}{\sum_{j=1}^{p}\lambda_j},
$$

累计贡献率为：

$$
\eta_{1:q}=\frac{\sum_{k=1}^{q}\lambda_k}{\sum_{j=1}^{p}\lambda_j}.
$$

## 3. 主成分数量选择

常见依据：

- 累计方差贡献率达到预设水平，如 80% 或 85%；
- 对相关矩阵使用 Kaiser 准则，保留特征值大于1的成分；
- 查看碎石图拐点；
- 使用平行分析；
- 结合成分的可解释性与下游任务表现。

不能只机械采用一个阈值，应同时说明结果是否容易解释。

## 4. 因子分析模型

设有 \(p\) 个观测变量和 \(m\) 个公共因子：

$$
\boldsymbol X=\boldsymbol\mu+L\boldsymbol F+\boldsymbol\varepsilon,
$$

其中：

- \(L\) 为因子载荷矩阵；
- \(\boldsymbol F\) 为公共因子；
- \(\boldsymbol\varepsilon\) 为各变量的特殊因子。

变量 \(i\) 的共同度为：

$$
h_i^2=\sum_{j=1}^{m}l_{ij}^2,
$$

表示公共因子能够解释该变量方差的比例。

## 5. 因子分析前检验

### KMO检验

KMO 比较简单相关与偏相关的相对大小，越接近1越适合因子分析。常见经验是 KMO 大于0.6才具有基本可接受性，但应结合领域和样本情况判断。

### Bartlett球形检验

原假设为相关矩阵是单位矩阵。若检验显著，说明变量之间存在足够相关性，可考虑因子分析。

统计显著不代表模型一定有实际意义，还需检查样本量、共同度和载荷结构。

## 6. 因子旋转

初始因子常难解释，可进行旋转：

- Varimax：正交旋转，假设因子不相关；
- Promax、Oblimin：斜交旋转，允许因子相关。

旋转主要改善解释性，不改变变量总共同度。现实中的潜在因素常可能相关，不应默认正交旋转一定更合理。

## 7. PCA建模步骤

1. 检查缺失值、异常值及变量相关性。
2. 对量纲不同的指标进行标准化。
3. 计算相关或协方差矩阵。
4. 完成特征分解并选择主成分数量。
5. 分析载荷，解释各主成分含义。
6. 计算样本的主成分得分。
7. 用贡献率加权构造综合分数时，说明该做法的含义。
8. 检查排序或降维结果的稳定性。

## 8. 因子分析步骤

1. 确定理论指标体系并获得足够样本。
2. 标准化数据，检查相关矩阵。
3. 进行 KMO 与 Bartlett 检验。
4. 选择公共因子提取方法和因子数量。
5. 选择正交或斜交旋转。
6. 根据高载荷变量为因子命名。
7. 计算因子得分，并检查共同度及残差相关。
8. 必要时用独立样本进行验证性因子分析。

## 9. Python实现

PCA可使用 `scikit-learn`：

```python
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

model = make_pipeline(StandardScaler(), PCA(n_components=0.85))
scores = model.fit_transform(X)
```

因子分析可使用 `factor_analyzer`：

```python
from factor_analyzer import FactorAnalyzer

fa = FactorAnalyzer(n_factors=3, rotation="varimax")
factor_scores = fa.fit_transform(X_standardized)
loadings = fa.loadings_
```

若需 KMO 和 Bartlett 检验，可使用该库提供的相应函数。实际代码中应保存标准化参数、载荷矩阵和解释方差。

## 10. PCA用于综合评价

可用前 \(q\) 个主成分构造综合分数：

$$
S_i=\sum_{k=1}^{q}\omega_kF_{ik},
$$

其中 \(\omega_k\) 可取主成分贡献率归一化值。需要注意：PCA最大化的是方差，不是“优劣”。在综合评价前必须统一原始指标方向，并解释高分为何代表更优。

## 11. PCA与因子分析如何选择

- 目标是压缩变量、消除共线性、为回归或聚类提供输入：PCA。
- 目标是寻找满意度、能力、风险等不可观测潜在维度：因子分析。
- 只需要构造客观综合指标：可考虑 PCA，但必须先处理指标方向。
- 强调理论潜变量结构：探索性因子分析后，还应考虑验证性因子分析。

## 12. 常见错误

- 不标准化不同量纲的变量，导致大尺度变量支配主成分。
- 变量之间几乎不相关，仍强行做 PCA 或因子分析。
- 将主成分分析与因子分析视为完全相同的方法。
- 仅按特征值大于1机械保留成分。
- 根据载荷随意命名因子，没有领域依据。
- 直接用 PCA 得分排名，却未统一正负指标方向。
- 把方差贡献率解释为对现实结果的因果解释比例。
- 样本很少、变量很多，却不讨论估计稳定性。

## 13. 论文写法

应报告数据标准化方式、相关矩阵依据、KMO/Bartlett结果（因子分析）、成分或因子数量选择、解释方差、载荷矩阵、旋转方法及得分公式。若用于排名，还应报告指标方向、综合分数构造和敏感性分析。
