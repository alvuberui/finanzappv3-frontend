export const setTheme = (theme: "light" | "dark") => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const getTheme = () =>
  document.documentElement.getAttribute("data-theme") ?? "light";
