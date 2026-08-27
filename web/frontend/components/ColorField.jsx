import { useMemo, useState } from "react";
import { TextField, Popover, ColorPicker, hexToRgb, rgbToHsb, hsbToHex } from "@shopify/polaris";

const FALLBACK_HSB = { hue: 0, saturation: 0, brightness: 0 };

export const ColorField = ({ label, value, onChange, helpText }) => {
  const [popoverActive, setPopoverActive] = useState(false);

  const hsbColor = useMemo(() => {
    try {
      return rgbToHsb(hexToRgb(value));
    } catch {
      return FALLBACK_HSB;
    }
  }, [value]);

  const swatch = (
    <button
      type="button"
      onClick={() => setPopoverActive((active) => !active)}
      aria-label={`Choose ${label.toLowerCase()}`}
      style={{
        width: "28px",
        height: "28px",
        margin: "auto 8px",
        borderRadius: "4px",
        border: "1px solid rgba(0, 0, 0, 0.15)",
        background: value,
        cursor: "pointer",
        padding: 0,
      }}
    />
  );

  return (
    <TextField
      label={label}
      value={value}
      onChange={onChange}
      autoComplete="off"
      helpText={helpText}
      connectedRight={
        <Popover
          active={popoverActive}
          onClose={() => setPopoverActive(false)}
          activator={swatch}
          preferredAlignment="right"
        >
          <div style={{ padding: "16px" }}>
            <ColorPicker
              color={hsbColor}
              onChange={(color) => onChange(hsbToHex(color))}
            />
          </div>
        </Popover>
      }
    />
  );
};
