import Link from "next/link";
import type { Staff } from "@/lib/admin/auth";
import { todayFor } from "@/lib/admin/today";

/* The first block of the admin home: what this role should take care of today. */
export async function TodayCard({ staff }: { staff: Staff }) {
  const items = await todayFor(staff);
  return (
    <section className="a-card a-today" style={{ marginBottom: 24 }}>
      <div className="a-card-head"><h2>Что сделать сегодня</h2>{items.length > 0 && <span className="muted num">{items.length}</span>}</div>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item.key} className={item.urgent ? "is-urgent" : undefined}>
              <Link href={item.href}>
                <b className="num">{item.count}</b>
                <span>
                  {item.label}
                  {item.hint && <small>{item.hint}</small>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ margin: 0 }}>Всё разобрано: новых задач для вашей роли нет.</p>
      )}
    </section>
  );
}
