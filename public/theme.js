(() => {
  const DEFAULT_THEME = {
    primaryColor: "#132238",
    secondaryColor: "#A77943"
  };

  const normalizeHex = (value, fallback) => {
    const raw = String(value || "").trim();
    const short = /^#([0-9a-f]{3})$/i.exec(raw);
    const full = /^#([0-9a-f]{6})$/i.exec(raw);

    if (short) {
      return (
        "#" +
        short[1]
          .split("")
          .map((char) => char + char)
          .join("")
      ).toUpperCase();
    }

    if (full) return ("#" + full[1]).toUpperCase();
    return fallback;
  };

  const hexToRgb = (hex) => {
    const value = normalizeHex(hex, "#000000").slice(1);
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  };

  const mixHex = (source, target, amount) => {
    const a = hexToRgb(source);
    const b = hexToRgb(target);
    const mix = (key) =>
      Math.round(a[key] + (b[key] - a[key]) * amount)
        .toString(16)
        .padStart(2, "0");

    return ("#" + mix("r") + mix("g") + mix("b")).toUpperCase();
  };

  const rgbString = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    return r + ", " + g + ", " + b;
  };

  const applyTheme = (theme = {}) => {
    const primaryColor = normalizeHex(
      theme.primaryColor,
      DEFAULT_THEME.primaryColor
    );
    const secondaryColor = normalizeHex(
      theme.secondaryColor,
      DEFAULT_THEME.secondaryColor
    );

    const primary950 = mixHex(primaryColor, "#000000", 0.38);
    const primary850 = mixHex(primaryColor, "#FFFFFF", 0.05);
    const primary800 = mixHex(primaryColor, "#FFFFFF", 0.11);
    const secondary600 = mixHex(secondaryColor, "#000000", 0.15);
    const secondary400 = mixHex(secondaryColor, "#FFFFFF", 0.18);

    const root = document.documentElement;
    root.style.setProperty("--navy-950", primary950);
    root.style.setProperty("--navy-900", primaryColor);
    root.style.setProperty("--navy-850", primary850);
    root.style.setProperty("--navy-800", primary800);
    root.style.setProperty("--bronze-600", secondary600);
    root.style.setProperty("--bronze-500", secondaryColor);
    root.style.setProperty("--bronze-400", secondary400);
    root.style.setProperty("--primary-rgb", rgbString(primaryColor));
    root.style.setProperty("--primary-dark-rgb", rgbString(primary950));
    root.style.setProperty("--secondary-rgb", rgbString(secondaryColor));
    root.style.setProperty("--secondary-light-rgb", rgbString(secondary400));

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", primaryColor);

    return { primaryColor, secondaryColor };
  };

  window.RETORNA_THEME = {
    DEFAULT_THEME,
    normalizeHex,
    applyTheme
  };
})();
