import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-6">
      <div className="card max-w-lg p-10 text-center">
        <p className="eyebrow justify-center">Ошибка 404</p>
        <h1 className="mt-3 ff-serif text-3xl font-bold">Такой темы нет</h1>
        <p className="mt-3 text-soft">Проверьте адрес или вернитесь к списку тем раздела.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Ко всем темам
        </Link>
      </div>
    </main>
  );
}
