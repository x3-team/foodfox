export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F8F9F6] text-[#0B0C08] xl:flex-row">
      <aside className="flex flex-col justify-between gap-8 bg-[#21251D] px-5 py-8 text-[#F8F9F6] sm:px-8 xl:w-[540px] xl:shrink-0 xl:px-14 xl:py-[52px]">
        <div>
          <div className="text-[26px] font-extrabold tracking-[1px]">FOX</div>
          <div className="mt-1 text-[13px] text-[#A8AAA3]">
            Партнёрская программа
          </div>
        </div>
        <div>
          <h1 className="max-w-[428px] text-[28px] font-light leading-8 tracking-[-0.5px] sm:text-[34px] sm:leading-10 xl:text-[40px] xl:leading-[46px] xl:tracking-[-1px]">
            Рекомендуйте тест FOX и получайте вознаграждение
          </h1>
          <p className="mt-4 max-w-[428px] text-[15px] leading-6 text-[#A8AAA3] sm:text-[16px]">
            Клиент сдаёт тест и присылает вам отчёт. Вы загружаете его в кабинет
            — мы сверяем по базе лаборатории и начисляем вознаграждение.
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
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
      <section className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8 xl:px-10">
        <div className="w-full max-w-[440px]">{children}</div>
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
