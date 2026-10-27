"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import { toast } from "sonner";
import { WalletProvider, ConnectWalletButton, useWallet } from "./Wallet";
import Toaster from "./Toaster";
import { NET } from "../lib/chain";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../lib/contract";

const DEPLOYED = CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000";
const CATEGORIES = ["writing", "design", "research", "support", "coding", "data", "other"];
const PAGE = 200;

type Agent = {
  id: number;
  owner: string;
  name: string;
  category: string;
  description: string;
  registeredAt: number;
  updatedAt: number;
};

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function readContract() {
  const p = new JsonRpcProvider(NET.rpc, NET.chainId, { staticNetwork: true });
  return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as string[], p);
}

function Directory() {
  const { status, address, provider } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [busy, setBusy] = useState(false);

  // register form
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [desc, setDesc] = useState("");

  const load = useCallback(async () => {
    if (!DEPLOYED) {
      setLoading(false);
      return;
    }
    try {
      const c = readContract();
      const count = Number(await c.agentCount());
      if (count === 0) {
        setAgents([]);
        setLoading(false);
        return;
      }
      const rows = await c.agentsPage(Math.max(0, count - PAGE), Math.min(count, PAGE));
      const list: Agent[] = rows.map((r: any, i: number) => ({
        id: Math.max(0, count - PAGE) + i,
        owner: r.owner,
        name: r.name,
        category: r.category,
        description: r.description,
        registeredAt: Number(r.registeredAt),
        updatedAt: Number(r.updatedAt),
      }));
      setAgents(list.reverse());
    } catch (e) {
      toast.error("could not load directory — RPC hiccup");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const register = async () => {
    if (status !== "ready" || !provider) return toast.warning("connect your wallet first");
    if (!name.trim() || !desc.trim()) return toast.warning("name and description required");
    setBusy(true);
    try {
      const signer = await new BrowserProvider(provider as any).getSigner();
      const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as string[], signer);
      const tx = await c.register(name.trim(), category, desc.trim());
      toast.info("registering…", { description: tx.hash.slice(0, 18) + "…" });
      const r = await tx.wait();
      if (r.status === 1) {
        toast.success("agent registered");
        setName("");
        setDesc("");
        void load();
      } else toast.error("transaction reverted");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.reason ?? e?.message ?? "register failed");
    } finally {
      setBusy(false);
    }
  };

  const saveDesc = async (id: number) => {
    if (status !== "ready" || !provider) return;
    if (!editText.trim()) return toast.warning("description required");
    setBusy(true);
    try {
      const signer = await new BrowserProvider(provider as any).getSigner();
      const c = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI as unknown as string[], signer);
      const tx = await c.updateDescription(id, editText.trim());
      toast.info("updating…");
      const r = await tx.wait();
      if (r.status === 1) {
        toast.success("description updated");
        setEditId(null);
        void load();
      } else toast.error("transaction reverted");
    } catch (e: any) {
      toast.error(e?.shortMessage ?? e?.reason ?? "update failed");
    } finally {
      setBusy(false);
    }
  };

  const categories = useMemo(() => {
    const s = new Set(agents.map((a) => a.category));
    return ["all", ...[...s].sort()];
  }, [agents]);

  const shown = useMemo(
    () =>
      agents.filter(
        (a) =>
          (filter === "all" || a.category === filter) &&
          (!search ||
            a.name.toLowerCase().includes(search.toLowerCase()) ||
            a.description.toLowerCase().includes(search.toLowerCase()))
      ),
    [agents, filter, search]
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32">
      {!DEPLOYED && (
        <p className="mt-6 rounded-md border border-warning/40 bg-card px-4 py-3 text-xs text-warning">
          contract not deployed yet — run <code>npm run deploy</code> after funding the deployer
        </p>
      )}

      <section id="register" className="frosted mt-8 scroll-mt-8 rounded-lg p-7">
        <h2 className="text-lg font-medium tracking-tight text-foreground">Register your agent</h2>
        <p className="mt-1 text-sm text-secondary">
          Anyone can list an AI agent. One registration per row; the owner can edit the
          description later.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_160px]">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            placeholder="agent name"
            aria-label="agent name"
            className="rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="category"
            className="rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-border-strong focus:outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            maxLength={512}
            rows={2}
            placeholder="what the agent does…"
            aria-label="description"
            className="sm:col-span-2 rounded-md border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none"
          />
        </div>
        <button
          onClick={register}
          disabled={busy || status !== "ready"}
          className="mt-4 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
        >
          {busy ? "submitting…" : "Register agent"}
        </button>
      </section>

      <section id="directory" className="mt-10 scroll-mt-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-medium tracking-tight text-foreground">Directory</h2>
          <span className="text-xs text-muted-foreground">{agents.length} registered</span>
          <div className="ml-auto flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search…"
              aria-label="search agents"
              className="w-32 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:outline-none"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              aria-label="filter by category"
              className="rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-foreground focus:border-border-strong focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p className="mt-4 text-xs text-muted-foreground">loading directory…</p>
        ) : shown.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border-strong px-4 py-8 text-center text-xs text-muted-foreground">
            {DEPLOYED ? "no agents yet — be the first to register" : "deploy the contract to populate"}
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {shown.map((a, i) => (
              <li key={a.id} className="frosted rounded-lg p-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-sm font-medium text-foreground">{a.name}</span>
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wide text-secondary">
                    {a.category}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">
                    <a
                      className="underline decoration-dotted underline-offset-2 hover:text-secondary"
                      href={`${NET.explorer}/address/${a.owner}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {short(a.owner)}
                    </a>
                  </span>
                  <span className="text-sm text-secondary tabular-nums">
                    {String(shown.length - i).padStart(2, "0")}
                  </span>
                </div>

                {editId === a.id ? (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      maxLength={512}
                      aria-label="new description"
                      className="flex-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground focus:border-border-strong focus:outline-none"
                    />
                    <button
                      onClick={() => saveDesc(a.id)}
                      disabled={busy}
                      className="rounded-full bg-primary px-3.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
                    >
                      save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="rounded-full border border-border px-3.5 py-1 text-xs text-muted-foreground hover:text-secondary"
                    >
                      cancel
                    </button>
                  </div>
                ) : (
                  <p className="mt-1.5 text-xs leading-relaxed text-secondary">{a.description}</p>
                )}

                {status === "ready" &&
                  a.owner.toLowerCase() === address.toLowerCase() &&
                  editId !== a.id && (
                    <button
                      onClick={() => {
                        setEditId(a.id);
                        setEditText(a.description);
                      }}
                      className="mt-2.5 text-[10px] uppercase tracking-wide text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
                    >
                      edit description
                    </button>
                  )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default function Home() {
  return (
    <WalletProvider chainId={NET.chainId} chainName={NET.name} rpc={NET.rpc} explorer={NET.explorer}>
      <div className="relative min-h-screen bg-surface text-foreground font-sans">
        <section className="dusk-hero">
          <div className="mx-auto max-w-3xl px-4 pb-16 pt-16 sm:pt-20">
            <p className="text-sm text-foreground/80">Introducing AgentID</p>
            <h1 className="mt-3 text-[40px] font-medium leading-[1.05] tracking-[-0.02em] text-white sm:text-[56px]">
              The agent registry
              <br />
              that never sleeps.
            </h1>
            <ul className="mt-7 space-y-4 text-[15px] text-foreground/90">
              {[
                "Register any AI agent on-chain — name, category, description",
                "Owner-signed updates, verifiable by anyone",
                "Live on BOT Chain mainnet · permanent, queryable",
              ].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span aria-hidden className="h-4 w-4 rounded-sm bg-white/95" />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="#register"
              className="mt-8 inline-block rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Register an agent →
            </a>
          </div>
        </section>
        <Directory />
        <footer className="mx-auto max-w-3xl border-t border-border px-4 pb-32 pt-8">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <a
              href="https://www.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              title="BOT Chain"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/bot-chain.svg" alt="BOT Chain" className="h-4 w-auto opacity-80 hover:opacity-100" />
            </a>
            <a
              href="https://www.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              botchain.ai ↗
            </a>
            <a
              href="https://scan.botchain.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              BOT Chain Explorer ↗
            </a>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            AgentID is built on BOT Chain mainnet (chain 677).
          </p>
        </footer>
        <nav className="frosted fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-5 rounded-full py-2 pl-5 pr-2">
          <span className="text-sm font-medium tracking-tight text-foreground">AgentID</span>
          <a href="#directory" className="hidden text-xs text-foreground/85 hover:text-foreground sm:block">
            Directory
          </a>
          <a href="#register" className="hidden text-xs text-foreground/85 hover:text-foreground sm:block">
            Register
          </a>
          <ConnectWalletButton />
        </nav>
      </div>
      <Toaster />
    </WalletProvider>
  );
}
