# Pandas 在数学建模竞赛中的常用代码

Pandas 主要处理带行列标签的表格数据。比赛中常用它读取 Excel 和 CSV、检查数据质量、清洗字段、合并多表、进行分组统计、构造时间特征并导出论文结果。

## 1. 导入与路径管理

```python
from pathlib import Path
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
```

不要把 `C:/Users/某人/Desktop/...` 等个人绝对路径写进代码。Notebook 中没有 `__file__` 时，可使用 `Path.cwd()`，但运行前要确认当前工作目录。

## 2. 读取 CSV 与 Excel

```python
# CSV
df = pd.read_csv(
    DATA_DIR / "input.csv",
    encoding="utf-8-sig",
    na_values=["", "NA", "N/A", "-", "--"],
)

# 单个工作表
df = pd.read_excel(
    DATA_DIR / "附件.xlsx",
    sheet_name="数据",
    na_values=["", "NA", "-", "--"],
)

# 一次读取全部工作表，返回 {工作表名: DataFrame}
sheets = pd.read_excel(DATA_DIR / "附件.xlsx", sheet_name=None)
for sheet_name, sheet_df in sheets.items():
    print(sheet_name, sheet_df.shape)
```

出现中文乱码时，CSV 可依次检查 `utf-8-sig`、`gbk` 或 `gb18030`。不要靠猜测反复修改原文件，应先确认文件编码和表头位置。

## 3. 第一轮数据审计

```python
print(df.shape)
print(df.head())
print(df.tail())
print(df.sample(min(5, len(df)), random_state=42))
print(df.columns.tolist())
print(df.dtypes)
print(df.info())

missing_report = (
    df.isna()
      .mean()
      .sort_values(ascending=False)
      .rename("missing_rate")
)

numeric_summary = df.describe().T
all_summary = df.describe(include="all").T
duplicate_count = df.duplicated().sum()
```

拿到附件后至少核对：行数、列数、主键、字段类型、时间范围、单位、缺失率、重复行和极端值。

## 4. 清理列名和字符串

```python
df = df.copy()

df.columns = (
    df.columns.astype(str)
      .str.strip()
      .str.replace("\n", "", regex=False)
      .str.replace(" ", "_", regex=False)
)

text_columns = df.select_dtypes(include=["object", "string"]).columns
for column in text_columns:
    df[column] = df[column].astype("string").str.strip()

df = df.rename(columns={
    "地区名称": "region",
    "统计日期": "date",
    "指标值": "value",
})
```

建议尽早统一字段名，但要同时保存数据字典，说明原始字段、清洗后字段、含义和单位。

## 5. 类型转换与日期处理

```python
df["value"] = pd.to_numeric(df["value"], errors="coerce")
df["date"] = pd.to_datetime(df["date"], errors="coerce")
df["region"] = df["region"].astype("string")

df["year"] = df["date"].dt.year
df["month"] = df["date"].dt.month
df["quarter"] = df["date"].dt.quarter
df["dayofweek"] = df["date"].dt.dayofweek
```

使用 `errors="coerce"` 会把无法解析的内容转为缺失值，因此转换后必须统计新增了多少缺失。

```python
before_missing = df["value"].isna().sum()
converted = pd.to_numeric(df["value"], errors="coerce")
after_missing = converted.isna().sum()
print("类型转换新增缺失：", after_missing - before_missing)
```

## 6. 重复值与主键检查

```python
key_columns = ["region", "date"]

duplicate_rows = df[df.duplicated(key_columns, keep=False)]
print("重复主键数：", len(duplicate_rows))

# 确认重复是错误后再删除
df = df.drop_duplicates(key_columns, keep="last")

if df.duplicated(key_columns).any():
    raise ValueError("主键仍不唯一")
```

不能仅根据整行完全相同来判断重复。应先确定业务主键，并分析同一主键出现多次是重复记录、不同口径，还是合理的多条观测。

## 7. 缺失值处理

```python
# 删除目标变量缺失的行
df = df.dropna(subset=["value"])

# 连续变量按地区中位数插补
df["income"] = (
    df.groupby("region")["income"]
      .transform(lambda series: series.fillna(series.median()))
)

# 类别变量使用众数或明确标签
df["category"] = df["category"].fillna("未知")

# 时间序列按主体排序后插值
df = df.sort_values(["region", "date"])
df["value_interpolated"] = (
    df.groupby("region")["value"]
      .transform(lambda series: series.interpolate(limit_direction="both"))
)
```

时间插值可能使用未来信息。若任务是预测未来，应只使用预测时点之前可获得的数据，并对训练集和测试集分别设计处理流程。

## 8. 条件筛选与新增字段

```python
subset = df.loc[
    (df["date"] >= "2025-01-01")
    & (df["region"].isin(["A市", "B市"]))
    & (df["value"].between(0, 100)),
    ["region", "date", "value"],
].copy()

df = df.assign(
    value_per_capita=df["value"] / df["population"].replace(0, np.nan),
    log_value=np.log1p(df["value"].clip(lower=0)),
)

df["level"] = pd.cut(
    df["value"],
    bins=[-np.inf, 60, 80, np.inf],
    labels=["低", "中", "高"],
)
```

复杂筛选条件应分别加括号。筛选后继续修改数据时使用 `copy()`，避免链式赋值问题。

## 9. 异常值标记

按组使用 IQR 标记异常，不直接删除：

```python
grouped_value = df.groupby("region")["value"]
q1 = grouped_value.transform(lambda series: series.quantile(0.25))
q3 = grouped_value.transform(lambda series: series.quantile(0.75))
iqr = q3 - q1

lower = q1 - 1.5 * iqr
upper = q3 + 1.5 * iqr
df["is_outlier"] = ~df["value"].between(lower, upper)
```

`transform` 会把每组计算得到的上下界映射回原表，能够保留原有行索引和全部字段。

## 10. 排序、排名与分组统计

```python
df = df.sort_values(["date", "value"], ascending=[True, False])

df["rank_within_date"] = (
    df.groupby("date")["value"]
      .rank(method="min", ascending=False)
)

summary = (
    df.groupby("region", as_index=False)
      .agg(
          sample_count=("value", "size"),
          mean_value=("value", "mean"),
          median_value=("value", "median"),
          std_value=("value", "std"),
          min_value=("value", "min"),
          max_value=("value", "max"),
      )
      .sort_values("mean_value", ascending=False)
)
```

`agg` 用于生成每组一行的汇总表；`transform` 返回与原表等长的结果，适合组内标准化、插补和排名。

组内标准化：

```python
group_mean = df.groupby("region")["value"].transform("mean")
group_std = df.groupby("region")["value"].transform("std")
df["value_zscore"] = (df["value"] - group_mean) / group_std.replace(0, np.nan)
```

## 11. 多表合并

```python
merged = left.merge(
    right,
    on=["region", "date"],
    how="left",
    validate="one_to_one",
    indicator=True,
)

match_report = merged["_merge"].value_counts(dropna=False)
unmatched = merged.loc[merged["_merge"] != "both"]
merged = merged.drop(columns="_merge")
```

`validate` 能尽早发现重复主键导致的行数膨胀：

- `one_to_one`：左右键都唯一；
- `many_to_one`：左表可重复，右表必须唯一；
- `one_to_many`：左表唯一，右表可重复。

纵向拼接：

```python
all_years = pd.concat(
    [df_2024, df_2025, df_2026],
    axis=0,
    ignore_index=True,
)
```

## 12. 长宽表转换与交叉表

```python
# 长表转宽表
wide = df.pivot_table(
    index="date",
    columns="region",
    values="value",
    aggfunc="mean",
)

# 宽表转长表
long = wide.reset_index().melt(
    id_vars="date",
    var_name="region",
    value_name="value",
)

# 类别频数和比例
count_table = pd.crosstab(df["region"], df["level"])
rate_table = pd.crosstab(
    df["region"],
    df["level"],
    normalize="index",
)
```

## 13. 时间序列常用特征

```python
df = df.sort_values(["region", "date"]).copy()
grouped = df.groupby("region")["value"]

df["lag_1"] = grouped.shift(1)
df["lag_7"] = grouped.shift(7)
df["difference_1"] = grouped.diff(1)
df["growth_rate"] = grouped.pct_change(fill_method=None)

# 先 shift 再 rolling，确保当前值没有进入预测特征
df["rolling_mean_7"] = (
    grouped.shift(1)
           .rolling(7, min_periods=3)
           .mean()
           .reset_index(level=0, drop=True)
)
```

按固定时间频率汇总：

```python
monthly = (
    df.set_index("date")
      .groupby("region")["value"]
      .resample("MS")
      .mean()
      .reset_index()
)
```

构造滞后和滚动特征前必须先按主体和时间排序。预测任务中要确认每个特征在预测时点确实可获得。

## 14. 类别编码与建模矩阵

```python
model_df = pd.get_dummies(
    df,
    columns=["region", "category"],
    drop_first=False,
    dtype=int,
)

feature_columns = ["income", "population", "lag_1"]
model_data = model_df.dropna(subset=feature_columns + ["value"])

X = model_data[feature_columns].to_numpy(dtype=float)
y = model_data["value"].to_numpy(dtype=float)
```

机器学习任务更推荐将编码、插补和标准化放进 scikit-learn Pipeline，避免在全量数据上预处理造成泄漏。

## 15. 抽样与训练测试划分

```python
# 普通随机抽样
sample = df.sample(frac=0.2, random_state=42)

# 时间数据按时间切分
train = df[df["date"] < "2025-01-01"].copy()
test = df[df["date"] >= "2025-01-01"].copy()

# 按主体切分时先获取主体列表
rng = np.random.default_rng(42)
regions = df["region"].dropna().unique()
rng.shuffle(regions)
split = int(len(regions) * 0.8)
train_regions = set(regions[:split])
train = df[df["region"].isin(train_regions)].copy()
test = df[~df["region"].isin(train_regions)].copy()
```

时间数据不能随机打乱；同一用户、设备或地区的多条记录通常不能同时出现在训练集和测试集。

## 16. 导出结果

```python
summary.to_csv(
    OUTPUT_DIR / "summary.csv",
    index=False,
    encoding="utf-8-sig",
    float_format="%.6f",
)

with pd.ExcelWriter(OUTPUT_DIR / "results.xlsx", engine="openpyxl") as writer:
    summary.to_excel(writer, sheet_name="汇总结果", index=False)
    missing_report.to_excel(writer, sheet_name="缺失率")
    unmatched.to_excel(writer, sheet_name="未匹配记录", index=False)
```

向论文手交付时同时说明字段含义、单位、样本范围、参数版本和小数精度，不能只发送一个没有说明的 Excel 文件。

## 17. 可复用的数据审计函数

```python
def audit_dataframe(df, *, key_columns=None):
    report = {
        "rows": len(df),
        "columns": len(df.columns),
        "duplicate_rows": int(df.duplicated().sum()),
        "missing_cells": int(df.isna().sum().sum()),
    }

    if key_columns:
        report["duplicate_keys"] = int(
            df.duplicated(key_columns).sum()
        )

    column_report = pd.DataFrame({
        "dtype": df.dtypes.astype(str),
        "missing_count": df.isna().sum(),
        "missing_rate": df.isna().mean(),
        "unique_count": df.nunique(dropna=True),
    }).sort_values("missing_rate", ascending=False)

    return report, column_report


overview, columns = audit_dataframe(
    df,
    key_columns=["region", "date"],
)
print(overview)
columns.to_csv(OUTPUT_DIR / "data_audit.csv", encoding="utf-8-sig")
```

## 18. 常见错误

- 未检查表头、单位和主键就直接建模；
- 修改原始数据文件，无法追溯清洗过程；
- 忽略字符串前后空格和日期类型；
- 合并多表后不检查行数、匹配率和重复键；
- 对筛选结果链式赋值；
- 先使用全量数据插补、编码或标准化，再划分测试集；
- 时间序列构造滚动特征时包含当前值或未来值；
- 随意删除异常值和缺失值，不记录样本量变化；
- 只导出最终结果，不保留数据字典和清洗报告；
- 依赖未固定，换电脑后 Pandas 行为发生变化。

比赛中的可靠数据流程应做到：原始数据只读、处理步骤可重复、每一步样本变化可解释、最终建模字段和单位明确。
