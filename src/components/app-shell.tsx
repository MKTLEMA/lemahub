import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter, useRouterState } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProximityDot } from "@/components/proximity-dot";
import { BrandLogo, BrandSymbol } from "@/components/brand";
import { AlertaPopup } from "@/components/alerta-popup";
import { ChevronLeft, Menu, User, Shield, LogOut, Search } from "lucide-react";
import { calcularAlertas } from "@/lib/alerts";
import { useDb } from "@/lib/store";
import * as auth from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Bell,
  Users,
  Package,
  Receipt,
  CalendarDays,
  TrendingUp,
  Shirt,
  Pen,
  CupSoda,
  History,
} from "lucide-react";

const NAV = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard },
  { to: "/alertas", label: "Alertas", icon: Bell },
  { to: "/colaboradores", label: "Colaboradores", icon: Users },
  { to: "/castanhas", label: "Castanhas", icon: Package },
  { to: "/financeiro", label: "Financeiro", icon: Receipt },
  { to: "/eventos", label: "Eventos", icon: CalendarDays },
  { to: "/gastos-endomarketing", label: "Endomarketing", icon: TrendingUp },
  { to: "/estoque-fardamentos", label: "Fardamentos", icon: Shirt },
  { to: "/estoque-canetas", label: "Canetas", icon: Pen },
  { to: "/estoque-copos", label: "Copos", icon: CupSoda },
  { to: "/historico", label: "Histórico", icon: History },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const db = useDb();
  const router = useRouter();
  const { location } = useRouterState();
  const pathname = location.pathname;
  const alertas = useMemo(() => calcularAlertas(db), [db]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [avisado, setAvisado] = useState(false);
  const [popupAberto, setPopupAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      const email = await auth.currentEmail();
      if (!ativo) return;
      if (!email) {
        void router.navigate({ to: "/login", replace: true });
      } else {
        const n = await auth.currentNome();
        if (ativo) setNome(n);
      }
      if (ativo) setAuthChecked(true);
    })();
    return () => {
      ativo = false;
    };
  }, [router]);

  useEffect(() => {
    if (avisado || alertas.length === 0) return;
    setAvisado(true);
    setPopupAberto(true);
  }, [alertas, avisado]);

  const resultados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (q.length < 2) return [];
    const hits: { label: string; sub: string; to: string }[] = [];
    db.colaboradores.forEach((c) => {
      if (`${c.nome} ${c.setor} ${c.email}`.toLowerCase().includes(q))
        hits.push({ label: c.nome, sub: `Colaborador · ${c.setor}`, to: "/colaboradores" });
    });
    db.compras_castanhas.forEach((k) => {
      if (`${k.fornecedor} ${k.finalidade} ${k.solicitante}`.toLowerCase().includes(q))
        hits.push({ label: k.fornecedor, sub: `Castanhas · ${k.finalidade}`, to: "/castanhas" });
    });
    db.compras_financeiro.forEach((f) => {
      if (`${f.fornecedor} ${f.finalidade} ${f.solicitante}`.toLowerCase().includes(q))
        hits.push({ label: f.finalidade, sub: `Financeiro · ${f.fornecedor}`, to: "/financeiro" });
    });
    db.eventos.forEach((e) => {
      if (`${e.nome} ${e.cidade} ${e.local}`.toLowerCase().includes(q))
        hits.push({ label: e.nome, sub: `Evento · ${e.cidade}/${e.estado}`, to: "/eventos" });
    });
    return hits.slice(0, 8);
  }, [busca, db]);

  const badge = alertas.length;
  const pior = alertas.some((a) => a.severidade === "pendente")
    ? "pendente"
    : alertas.length > 0
      ? "alerta"
      : "ok";

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          {!collapsed ? <BrandLogo tone="white" /> : <BrandSymbol tone="white" />}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Recolher menu"
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setCollapsed((c) => !c)}
          >
            <ChevronLeft className="size-4 transition-transform" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {NAV.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <span className="relative">
                  <Icon className="size-4 shrink-0" />
                  {item.to === "/alertas" && badge > 0 && (
                    <span
                      className={cn(
                        "absolute -right-1.5 -top-1.5 size-2 rounded-full",
                        pior === "pendente" ? "bg-[var(--pendente)]" : "bg-[var(--alerta)]",
                      )}
                      style={{ animation: "lema-pulse-ring 2s infinite" }}
                    />
                  )}
                </span>
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && item.to === "/alertas" && badge > 0 && (
                  <span className="ml-auto rounded-full bg-sidebar-primary px-2 py-0.5 text-xs font-semibold text-sidebar-primary-foreground">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border px-2 py-3">
          <Link
            to="/perfil"
            title="Perfil"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === "/perfil"
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <User className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">Perfil</span>}
          </Link>
          <Link
            to="/admin"
            title="Admin"
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              pathname === "/admin"
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <Shield className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">Admin</span>}
          </Link>
          <button
            type="button"
            title="Sair"
            onClick={async () => {
              await auth.logout();
              await router.invalidate();
              await router.navigate({ to: "/login", replace: true });
            }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">Sair</span>}
          </button>
        </div>
      </aside>
      {/* Mobile navigation drawer using Sheet component */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <BrandLogo tone="white" className="w-8 h-8" />
              <span className="text-lg font-semibold">LEMA</span>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 px-2 py-2">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileNavOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-2 px-2">
            <Link
              to="/perfil"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === "/perfil"
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <User className="size-4 shrink-0" />
              Perfil
            </Link>
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === "/admin"
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Shield className="size-4 shrink-0" />
              Admin
            </Link>
            <button
              type="button"
              title="Sair"
              onClick={async () => {
                await auth.logout();
                await router.invalidate();
                await router.navigate({ to: "/login", replace: true });
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            >
              <LogOut className="size-4 shrink-0" />
              Sair
            </button>
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
          {/* Mobile hamburger menu */}
          <div className="flex h-16 items-center justify-between px-4 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir navegação"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
          </div>
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar em todos os módulos..."
              className="pl-9"
            />
            {resultados.length > 0 && (
              <div className="animate-rise absolute left-0 right-0 top-12 z-30 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                {resultados.map((r, i) => (
                  <Link
                    key={`${r.to}-${i}`}
                    to={r.to}
                    onClick={() => setBusca("")}
                    className="block px-3 py-2 text-sm hover:bg-accent/10"
                  >
                    <span className="font-medium">{r.label}</span>
                    <span className="block text-xs text-muted-foreground">{r.sub}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Link to="/alertas" className="mr-1 hidden sm:block">
              <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs">
                <ProximityDot severidade={pior as never} />
                {badge} alerta(s)
              </span>
            </Link>
            <ThemeToggle />
            <span className="ml-1 hidden items-center gap-2 sm:flex">
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {(nome || "LEMA").slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm text-muted-foreground">{nome}</span>
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>

      <AlertaPopup
        aberto={popupAberto}
        onOpenChange={setPopupAberto}
        alertas={alertas}
        eventos={db.eventos}
        onVerCentral={() => {
          void router.navigate({ to: "/alertas" });
        }}
      />
    </div>
  );
}
