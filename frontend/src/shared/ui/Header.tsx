import Link from "next/link";

type HeaderProps = {
  userName?: string;
  userRole?: "member" | "admin";
};

export function Header({ userName, userRole }: HeaderProps) {
  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-base font-semibold">
          勤怠管理
        </Link>
        {userName ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">{userRole}</span>
            <span className="font-medium">{userName}</span>
          </div>
        ) : null}
      </div>
    </header>
  );
}
