#!/usr/bin/env python3
"""Small SQLite helpers for the backup scripts. Python's sqlite3 module is part
of Ubuntu, so the VM needs no extra package.

  db.py backup SRC DEST   safe online copy of a database that is in use
  db.py check FILE        print "ok" if PRAGMA integrity_check passes
  db.py hash FILE         sha256 of the logical content (the SQL dump)
  db.py counts FILE       "table rows" for each app table
"""
import hashlib
import sqlite3
import sys


def open_ro(path):
    return sqlite3.connect(f"file:{path}?mode=ro", uri=True)


def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    if cmd == "backup" and len(argv) == 4:
        src = open_ro(argv[2])
        dst = sqlite3.connect(argv[3])
        with dst:
            src.backup(dst)
        dst.close()
        src.close()
    elif cmd == "check" and len(argv) == 3:
        con = open_ro(argv[2])
        print(con.execute("PRAGMA integrity_check").fetchone()[0])
        con.close()
    elif cmd == "hash" and len(argv) == 3:
        con = open_ro(argv[2])
        h = hashlib.sha256()
        for line in con.iterdump():
            h.update(line.encode())
            h.update(b"\n")
        print(h.hexdigest())
        con.close()
    elif cmd == "counts" and len(argv) == 3:
        con = open_ro(argv[2])
        tables = [
            r[0]
            for r in con.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table' "
                "AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%' ORDER BY name"
            )
        ]
        for t in tables:
            n = con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
            print(f"{t} {n}")
        con.close()
    else:
        print(__doc__, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
