import sys
import subprocess
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))


def main():
    print("""
╔══════════════════════════════════════════╗
║        Resume Matcher — Launcher        ║
╚══════════════════════════════════════════╝

Choose what to run:
  1) Backend only (FastAPI on :8000)
  2) Frontend only (React on :5173)
  3) Both (open two terminals)
""")
    choice = input("Enter 1, 2 or 3: ").strip()

    if choice == "1":
        print("\n→ Starting backend…")
        print("  API docs at http://localhost:8000/docs\n")
        subprocess.run([sys.executable, "-m", "uvicorn", "backend.main:app", "--reload", "--port", "8000"])

    elif choice == "2":
        print("\n→ Starting frontend…")
        os.chdir("frontend")
        subprocess.run(["npx", "vite", "--port", "5173"], shell=True)

    elif choice == "3":
        print("\n→ Run these in TWO separate terminals:\n")
        print("  Terminal 1 — Backend:")
        print("    cd week_01/day5")
        print("    uvicorn backend.main:app --reload --port 8000\n")
        print("  Terminal 2 — Frontend:")
        print("    cd week_01/day5/frontend")
        print("    npx vite --port 5173\n")
    else:
        print("Invalid choice.")


if __name__ == "__main__":
    main()
