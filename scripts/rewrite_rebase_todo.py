import pathlib
import sys


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit("Missing todo file path")

    todo_path = pathlib.Path(sys.argv[1])
    todo_text = todo_path.read_text(encoding="utf-8")
    todo_text = todo_text.replace("pick 6ecc0c2", "edit 6ecc0c2")
    todo_text = todo_text.replace("pick 3f96b65", "drop 3f96b65")
    todo_path.write_text(todo_text, encoding="utf-8")


if __name__ == "__main__":
    main()
