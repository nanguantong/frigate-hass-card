import orderBy from 'lodash-es/orderBy';

interface Range<T extends Date | number> {
  start: T;
  end: T;
}

export type DateRange = Range<Date>;

interface MemoryRangeSetInterface<T> {
  hasCoverage(range: T): boolean;
  add(range: T): void;
  clear(): void;
}

export class MemoryRangeSet implements MemoryRangeSetInterface<DateRange> {
  protected _ranges: DateRange[];

  constructor(ranges?: DateRange[]) {
    this._ranges = ranges ?? [];
  }

  public hasCoverage(range: DateRange): boolean {
    return this._ranges.some((cachedRange) =>
      rangeIsEntirelyContained(cachedRange, range),
    );
  }

  public add(range: DateRange): void {
    this._ranges.push(range);
    this._ranges = compressRanges(this._ranges);
  }

  public clear(): void {
    this._ranges = [];
  }
}

export interface ExpiringRange<T extends Date | number> extends Range<T> {
  expires: Date;
}

export class ExpiringMemoryRangeSet
  implements MemoryRangeSetInterface<ExpiringRange<Date>>
{
  protected _ranges: ExpiringRange<Date>[];

  constructor(ranges?: ExpiringRange<Date>[]) {
    this._ranges = ranges ?? [];
  }

  public hasCoverage(range: DateRange): boolean {
    const now = new Date();
    return this._ranges.some(
      (cachedRange) =>
        now < cachedRange.expires && rangeIsEntirelyContained(cachedRange, range),
    );
  }

  public add(range: ExpiringRange<Date>): void {
    this._expireOldRanges();
    this._ranges.push(range);
  }

  protected _expireOldRanges(): void {
    const now = new Date();
    this._ranges = this._ranges.filter((range) => now < range.expires);
  }

  public clear(): void {
    this._ranges = [];
  }
}

const rangeIsEntirelyContained = (bigger: DateRange, smaller: DateRange): boolean => {
  return smaller.start >= bigger.start && smaller.end <= bigger.end;
};

export const rangesOverlap = (a: DateRange, b: DateRange): boolean => {
  return (
    // a starts within the range of b.
    (a.start >= b.start && a.start <= b.end) ||
    // a ends within the range of b.
    (a.end >= b.start && a.end <= b.end) ||
    // a encompasses the entire range of b.
    (a.start <= b.start && a.end >= b.end)
  );
};

export const compressRanges = <T extends Date | number>(
  ranges: Range<T>[],
  toleranceSeconds = 0,
): Range<T>[] => {
  const compressedRanges: Range<T>[] = [];
  ranges = orderBy(ranges, (range) => range.start, 'asc');

  let current: Range<T> | null = null;
  for (let i = 0; i < ranges.length; ++i) {
    const item = ranges[i];
    const itemStartSeconds =
      item.start instanceof Date ? item.start.getTime() : item.start;

    if (!current) {
      current = { ...item };
      continue;
    }

    const currentEndSeconds =
      current.end instanceof Date ? current.end.getTime() : (current.end as number);

    if (currentEndSeconds + toleranceSeconds * 1000 >= itemStartSeconds) {
      if (item.end > current.end) {
        current.end = item.end;
      }
    } else {
      compressedRanges.push(current);
      current = { ...item };
    }
  }
  if (current) {
    compressedRanges.push(current);
  }

  return compressedRanges;
};
