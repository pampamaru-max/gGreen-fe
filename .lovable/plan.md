

## Problem
The footer containing "บันทึก" and "ยกเลิก" buttons is hidden because the content grid takes up `calc(90vh - 80px)` — leaving no room for the footer within the dialog's `max-h-[90vh]`.

## Fix
Restructure the `DialogContent` layout to use flexbox so the header and footer are fixed, and only the middle grid scrolls:

1. **`DialogContent`**: Add `flex flex-col` so children stack vertically within `max-h-[90vh]`.
2. **Header**: Add `shrink-0` so it doesn't compress.
3. **Grid (middle)**: Change from inline `maxHeight` to `flex-1 min-h-0 overflow-hidden` so it fills remaining space between header and footer.
4. **Footer**: Add `shrink-0` so it always stays visible at the bottom.

### Changes — `src/components/CategoryCard.tsx`

- Line 131: Add `flex flex-col` to `DialogContent`
- Line 133: Add `shrink-0` to `DialogHeader`
- Line 164: Replace `maxHeight` style with `flex-1 min-h-0 overflow-hidden`
- Footer div: Add `shrink-0`

