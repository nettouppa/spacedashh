import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const KEY = "sd-theme";

/** Toggles light/dark by setting `.dark` on <html>; choice saved in this browser. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains("dark")); }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(KEY, next ? "dark" : "light");
  };
  return (
    <button onClick={toggle} aria-label={dark ? "Usar tema claro" : "Usar tema escuro"} title={dark ? "Tema claro" : "Tema escuro"}
      className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

/** Runs before paint to avoid a flash of the wrong theme. */
export const THEME_SCRIPT = `try{var t=localStorage.getItem("${KEY}");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;
