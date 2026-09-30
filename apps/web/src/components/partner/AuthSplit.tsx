export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8F9F6] text-[#0B0C08]">
      <aside className="flex w-[540px] shrink-0 flex-col justify-between bg-[#21251D] px-14 py-[52px] text-[#F8F9F6]">
        <div>
          <div className="text-[26px] font-extrabold tracking-[1px]">FOX</div>
          <div className="mt-1 text-[13px] text-[#A8AAA3]">
            Партнёрская программа
          </div>
        </div>
        <div>
          <h1 className="max-w-[428px] text-[40px] font-light leading-[46px] tracking-[-1px]">
            Рекомендуйте тест FOX и получайте вознаграждение
          </h1>
          <p className="mt-[18px] max-w-[428px] text-[16px] leading-6 text-[#A8AAA3]">
            Клиент сдаёт тест и присылает вам отчёт. Вы загружаете его в кабинет
            — мы сверяем по базе лаборатории и начисляем вознаграждение.
          </p>
          <div className="mt-[18px] flex flex-wrap gap-2.5">
            {[
              ["2 400 ₽", "за отчёт"],
              ["5-го", "выплаты"],
              ["285", "антигенов"],
            ].map(([value, label]) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2.5 text-[13px]"
              >
                <span className="font-medium text-[#E7F551]">{value}</span>
                <span className="text-[#A8AAA3]">{label}</span>
              </span>
            ))}
          </div>
        </div>
        <p className="text-[13px] text-[#A8AAA3]">
          Сертификация после курса FOX · выплаты самозанятым и ИП
        </p>
      </aside>
      <section className="flex flex-1 items-center justify-center px-10">
        <div className="w-[440px]">{children}</div>
      </section>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[#5C5E57]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[14px] border border-[#E3E4DF] bg-white px-[18px] py-[15px] text-[15px] text-[#0B0C08] outline-none transition-[border-color] duration-150 focus:border-[#0B0C08]";
