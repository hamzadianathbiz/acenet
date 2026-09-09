Write a complete Python function normalize_deals(rows) and unittest tests as two artifacts.
Input: a list of dictionaries with keys name and amount_usd.
Output: a new list sorted by name, each item containing stripped name and amount_cents.
Convert using Decimal(str(value)), round half up to two decimal places, then integer cents.
Reject missing/blank/non-string names; reject boolean, negative, NaN, infinite or nonnumeric amounts with ValueError.
Never modify the input. Use only the Python standard library. Include empty input, invalid input,
half-cent rounding and non-mutation tests. Do not claim tests ran unless you actually ran them.
