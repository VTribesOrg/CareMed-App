from app import app
from extensions import db
from sqlalchemy import inspect

ctx = app.app_context()
ctx.push()

insp = inspect(db.engine)
db_tables = set(insp.get_table_names())

print("=== Model columns missing from the database ===")
total_missing = 0
for mapper in db.Model.registry.mappers:
    model = mapper.class_
    table = model.__table__
    if table.name not in db_tables:
        print(f"[TABLE MISSING] {table.name}")
        continue
    db_cols = {c["name"] for c in insp.get_columns(table.name)}
    for col in table.columns:
        if col.name not in db_cols:
            print(f"  {table.name}.{col.name}  ({col.type})")
            total_missing += 1
print(f"total missing columns: {total_missing}")