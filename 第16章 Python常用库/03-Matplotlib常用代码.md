# Matplotlib 在数学建模竞赛中的常用代码

Matplotlib 是数学建模论文绘图的基础库。比赛中应使用代码生成可复现的图，而不是依赖截图或手工修改。图形的任务是支持结论：展示分布、趋势、关系、预测误差、方案比较和参数敏感性。

## 1. 导入与中文显示

```python
from pathlib import Path
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

OUTPUT_DIR = Path("outputs") / "figures"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

plt.rcParams["font.sans-serif"] = [
    "Microsoft YaHei",
    "SimHei",
    "Arial Unicode MS",
]
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["figure.dpi"] = 120
plt.rcParams["savefig.dpi"] = 300
```

中文仍显示为方框时，说明电脑中不存在配置的字体。应安装统一字体，或将论文图中的文字改为英文，不能只在自己的电脑上检查。

## 2. 推荐的基础模板

```python
fig, ax = plt.subplots(figsize=(8, 5))

ax.plot(x, y, color="#2D6652", linewidth=2, label="观测值")
ax.set(
    title="指标变化趋势",
    xlabel="时间",
    ylabel="指标值（单位）",
)
ax.grid(alpha=0.25, linestyle="--")
ax.legend(frameon=False)

fig.tight_layout()
fig.savefig(
    OUTPUT_DIR / "figure_01_trend.png",
    bbox_inches="tight",
    facecolor="white",
)
plt.close(fig)
```

优先使用面向对象接口 `fig, ax = plt.subplots()`。批量绘图后调用 `plt.close(fig)`，避免内存中积累大量未关闭图形。

## 3. 折线图：时间趋势与多方案比较

```python
fig, ax = plt.subplots(figsize=(9, 5))

ax.plot(
    dates,
    actual,
    marker="o",
    markersize=4,
    linewidth=2,
    label="实际值",
)
ax.plot(
    dates,
    predicted,
    linestyle="--",
    linewidth=2,
    label="预测值",
)

ax.set_xlabel("日期")
ax.set_ylabel("需求量（件）")
ax.legend(frameon=False)
ax.grid(axis="y", alpha=0.25)
fig.autofmt_xdate()
fig.tight_layout()
```

多条曲线不要只依赖颜色区分，可同时使用实线、虚线、点标记等，保证灰度打印时仍能辨认。

## 4. 散点图与拟合曲线

```python
fig, ax = plt.subplots(figsize=(7, 5))

ax.scatter(
    x,
    y,
    s=32,
    alpha=0.7,
    color="#3B82A0",
    edgecolors="white",
    linewidths=0.4,
    label="样本",
)

order = np.argsort(x)
ax.plot(
    np.asarray(x)[order],
    np.asarray(y_pred)[order],
    color="#C65F46",
    linewidth=2,
    label="拟合结果",
)

ax.set(xlabel="影响因素 X（单位）", ylabel="响应 Y（单位）")
ax.legend(frameon=False)
ax.grid(alpha=0.2)
fig.tight_layout()
```

散点较多时降低 `alpha` 或减小点大小。拟合曲线应按横坐标排序后连接，否则会出现来回折返的错误折线。

## 5. 柱状图：方案和类别比较

```python
labels = ["方案A", "方案B", "方案C", "方案D"]
scores = np.array([0.72, 0.81, 0.67, 0.76])

fig, ax = plt.subplots(figsize=(7, 4.5))
bars = ax.bar(
    labels,
    scores,
    color=["#4C8C73", "#D39A55", "#6F86A5", "#A86F6F"],
)

ax.set_ylabel("综合得分")
ax.set_ylim(0, 1)
ax.bar_label(bars, fmt="%.3f", padding=3)
ax.grid(axis="y", alpha=0.2)
fig.tight_layout()
```

若类别很多，横向柱状图通常更易读：

```python
order = np.argsort(scores)

fig, ax = plt.subplots(figsize=(7, 5))
bars = ax.barh(
    np.asarray(labels)[order],
    scores[order],
    color="#4C8C73",
)
ax.bar_label(bars, fmt="%.3f", padding=3)
ax.set_xlabel("综合得分")
fig.tight_layout()
```

柱状图通常应从零开始，避免通过截断坐标轴夸大差异。

## 6. 分布图：直方图与箱线图

```python
fig, axes = plt.subplots(1, 2, figsize=(10, 4))

axes[0].hist(
    values,
    bins="auto",
    color="#4C8C73",
    edgecolor="white",
    alpha=0.85,
)
axes[0].axvline(np.mean(values), color="#C65F46", linestyle="--", label="均值")
axes[0].set(xlabel="指标值", ylabel="频数", title="指标分布")
axes[0].legend(frameon=False)

axes[1].boxplot(
    [group_a, group_b, group_c],
    showmeans=True,
)
axes[1].set_xticks([1, 2, 3], labels=["A组", "B组", "C组"])
axes[1].set(ylabel="指标值", title="分组箱线图")

fig.tight_layout()
```

箱线图中的离群点不等于错误数据。应结合原始记录和业务机制判断，而不是看到离群点就删除。

## 7. 相关系数热力图

不依赖 Seaborn 的 Matplotlib 写法：

```python
correlation = df[numeric_columns].corr(method="pearson")

fig, ax = plt.subplots(figsize=(8, 7))
image = ax.imshow(
    correlation,
    cmap="RdBu_r",
    vmin=-1,
    vmax=1,
    aspect="auto",
)

ax.set_xticks(range(len(correlation.columns)))
ax.set_yticks(range(len(correlation.index)))
ax.set_xticklabels(correlation.columns, rotation=45, ha="right")
ax.set_yticklabels(correlation.index)

for row in range(correlation.shape[0]):
    for column in range(correlation.shape[1]):
        value = correlation.iloc[row, column]
        ax.text(
            column,
            row,
            f"{value:.2f}",
            ha="center",
            va="center",
            fontsize=8,
            color="white" if abs(value) > 0.55 else "black",
        )

fig.colorbar(image, ax=ax, label="相关系数")
fig.tight_layout()
```

变量很多时不要在每个格子中标数值，否则图形会过度拥挤。相关性也不能直接解释为因果关系。

## 8. 多子图

```python
fig, axes = plt.subplots(
    2,
    2,
    figsize=(11, 8),
    sharex=False,
    constrained_layout=True,
)

axes[0, 0].plot(time, series_a)
axes[0, 0].set_title("(a) 原始序列")

axes[0, 1].hist(series_a, bins=20)
axes[0, 1].set_title("(b) 分布")

axes[1, 0].scatter(series_a, series_b, alpha=0.6)
axes[1, 0].set_title("(c) 变量关系")

axes[1, 1].plot(time, residuals)
axes[1, 1].axhline(0, color="black", linewidth=1)
axes[1, 1].set_title("(d) 残差")
```

子图应用于共同支持一个结论的图形。不要为了节省版面，把无关结果强行放在同一张图中。

## 9. 预测结果与置信区间

```python
fig, ax = plt.subplots(figsize=(9, 5))

ax.plot(time, actual, color="#2F4858", label="实际值")
ax.plot(time, predicted, color="#C65F46", label="预测值")
ax.fill_between(
    time,
    lower_bound,
    upper_bound,
    color="#C65F46",
    alpha=0.18,
    label="95% 预测区间",
)

ax.set(xlabel="时间", ylabel="预测目标（单位）")
ax.legend(frameon=False)
ax.grid(alpha=0.2)
fig.tight_layout()
```

区间必须说明是置信区间、预测区间还是多次随机实验的分位区间，三者含义不同。

## 10. 真实值—预测值图与残差图

```python
residuals = np.asarray(actual) - np.asarray(predicted)
lower = min(np.min(actual), np.min(predicted))
upper = max(np.max(actual), np.max(predicted))

fig, axes = plt.subplots(1, 2, figsize=(10, 4.5))

axes[0].scatter(actual, predicted, alpha=0.65)
axes[0].plot([lower, upper], [lower, upper], "k--", linewidth=1)
axes[0].set(
    xlabel="实际值",
    ylabel="预测值",
    title="实际值与预测值",
)

axes[1].scatter(predicted, residuals, alpha=0.65)
axes[1].axhline(0, color="black", linestyle="--", linewidth=1)
axes[1].set(
    xlabel="预测值",
    ylabel="残差",
    title="残差诊断",
)

fig.tight_layout()
```

只画两条时间曲线不够。残差图可以帮助发现系统偏差、异方差和异常样本。

## 11. 灵敏度分析曲线

```python
fig, ax = plt.subplots(figsize=(8, 5))

for parameter_name, output_values in sensitivity_results.items():
    ax.plot(
        perturbation_percent,
        output_values,
        marker="o",
        linewidth=1.8,
        label=parameter_name,
    )

ax.axvline(0, color="black", linewidth=1, alpha=0.6)
ax.set(
    xlabel="参数扰动幅度（%）",
    ylabel="模型输出",
    title="关键参数灵敏度分析",
)
ax.legend(frameon=False, ncol=2)
ax.grid(alpha=0.2)
fig.tight_layout()
```

不同输出量纲差异很大时，可绘制相对变化率，避免尺度大的指标在视觉上支配图形。

## 12. 带误差线的多次实验结果

```python
fig, ax = plt.subplots(figsize=(7, 4.5))

ax.errorbar(
    method_names,
    mean_scores,
    yerr=std_scores,
    fmt="o",
    capsize=4,
    markersize=6,
    color="#2D6652",
)

ax.set(xlabel="方法", ylabel="评价指标", title="多次独立实验结果")
ax.grid(axis="y", alpha=0.2)
fig.tight_layout()
```

图注中应说明误差线表示标准差、标准误还是置信区间，以及独立实验次数。

## 13. 绘制二维路线或节点

```python
coordinates = np.asarray(coordinates, dtype=float)
route = np.asarray(route, dtype=int)
closed_route = np.r_[route, route[0]]

fig, ax = plt.subplots(figsize=(7, 6))
ax.scatter(
    coordinates[:, 0],
    coordinates[:, 1],
    s=45,
    color="#C65F46",
    zorder=3,
)
ax.plot(
    coordinates[closed_route, 0],
    coordinates[closed_route, 1],
    color="#2D6652",
    linewidth=1.8,
)

for index, (x_coord, y_coord) in enumerate(coordinates):
    ax.annotate(
        str(index),
        (x_coord, y_coord),
        xytext=(5, 5),
        textcoords="offset points",
        fontsize=8,
    )

ax.set_aspect("equal", adjustable="datalim")
ax.set(xlabel="横坐标", ylabel="纵坐标", title="优化路线")
fig.tight_layout()
```

若经纬度跨度较大或研究区域接近极地，不能直接把经纬度当作平面坐标，应先选择合适的投影和距离公式。

## 14. 双坐标轴及其风险

```python
fig, first_axis = plt.subplots(figsize=(8, 5))
second_axis = first_axis.twinx()

first_line = first_axis.plot(
    time,
    temperature,
    color="#C65F46",
    label="温度",
)
second_line = second_axis.plot(
    time,
    demand,
    color="#2F6B8A",
    label="需求",
)

first_axis.set_ylabel("温度（℃）", color="#C65F46")
second_axis.set_ylabel("需求量（件）", color="#2F6B8A")

lines = first_line + second_line
first_axis.legend(
    lines,
    [line.get_label() for line in lines],
    frameon=False,
)
fig.tight_layout()
```

双坐标轴容易通过尺度选择制造虚假关联。能使用标准化后单坐标比较或上下子图时，应优先选择更透明的表达方式。

## 15. 统一保存图形

```python
def save_figure(fig, file_name, *, dpi=300):
    output_path = OUTPUT_DIR / file_name
    fig.savefig(
        output_path,
        dpi=dpi,
        bbox_inches="tight",
        facecolor="white",
    )
    plt.close(fig)
    return output_path


path = save_figure(fig, "figure_05_model_comparison.png")
print("图形已保存：", path)
```

论文常用格式：

- PNG：通用，建议 300 DPI；
- PDF、SVG：矢量格式，适合线条、文字和公式较多的图；
- JPG：适合照片，不推荐保存普通统计图。

应先保存再调用 `show()`，并统一使用有意义的文件名，使图号能够与论文和生成代码对应。

## 16. 论文绘图检查清单

- [ ] 图形确实回答某个问题，而不是只为展示画图能力；
- [ ] 图题、横纵轴、单位、图例完整；
- [ ] 字号在论文最终版面中仍然清晰；
- [ ] 颜色、线型和点型含义全文一致；
- [ ] 灰度打印和常见色觉缺陷下仍能辨认；
- [ ] 柱状图没有通过截断坐标夸大差异；
- [ ] 时间轴顺序正确，日期标签不过度重叠；
- [ ] 预测图包含样本外结果和必要的不确定性；
- [ ] 随机实验展示波动，而不是只展示最好一次；
- [ ] 图片由代码生成，文件名与论文编号对应；
- [ ] 最终文件使用 150—300 DPI 或矢量格式；
- [ ] 图中数字与冻结结果表一致。

## 17. 常见错误

- 中文字体只在自己的电脑可用，换电脑后乱码；
- 连续调用 `plt.plot`，未创建新画布导致图形叠加；
- 批量绘图后不关闭图形；
- 先 `show()` 再保存，得到空白或低质量图片；
- 横坐标未排序就连接散点；
- 颜色过多、图例过长、网格过重；
- 三维图、饼图和双坐标轴使用过度；
- 没有单位、样本范围、误差线含义或数据来源；
- 用训练集拟合效果图代替测试集评价；
- 手工编辑最终图片，造成代码结果与论文不一致。

比赛绘图应追求准确、克制和可复现。一张清晰表达关键结论的普通二维图，通常比复杂但难以解释的装饰性图形更有效。
