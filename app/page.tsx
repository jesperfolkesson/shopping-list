"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import { supabase } from "../lib/supabase"; // <-- ändra sökväg så den matchar var din fil ligger
// t.ex. "@/lib/supabase" eller "../lib/supabase"

import { normalizeName, detectCategoryFromDB } from "../lib/category";

type Item = {
  id: string;
  name: string;
  category: string;
  done: boolean;
  createdAt: number;
};

type ListRow = { id: string; name: string };

type UndoAction =
  | { type: "add"; item: Item }
  | { type: "delete"; item: Item }
  | { type: "toggleDone"; id: string; prevDone: boolean }
  | { type: "edit"; id: string; prev: { name: string; category: string } };

type UndoState =
  | {
      message: string;
      action: UndoAction;
    }
  | null;

const SWIPE_OPEN_PX = 96;
const SWIPE_THRESHOLD = 60;
const SWIPE_DELETE_THRESHOLD = 140;
const TOAST_MS = 6000;


export default function Home() {
  const [loginEmail, setLoginEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");  
  const [session, setSession] = useState<any>(null);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lists, setLists] = useState<ListRow[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [listsLoading, setListsLoading] = useState(false);
  const [listsError, setListsError] = useState<string | null>(null);
  const [shareEmail, setShareEmail] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [editListOpen, setEditListOpen] = useState(false);
  const [editListName, setEditListName] = useState("");
  const [createListOpen, setCreateListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");

  // Förslag
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [categoryPopupOpen, setCategoryPopupOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<{ name: string } | null>(null);

  // Fokus: endast efter "Lägg till" (inte efter bock/undo/delete)
  const focusAfterAddRef = useRef(false);

  // Redigering
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Swipe
  const [openId, setOpenId] = useState<string | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const draggingId = useRef<string | null>(null);
  const [dragXById, setDragXById] = useState<Record<string, number>>({});
  const lastXRef = useRef<Record<string, number>>({});
  const isSwipingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<{ id: string; x: number } | null>(null);

  const [undo, setUndo] = useState<UndoState>(null);
  const undoTimerRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [inlineMsg, setInlineMsg] = useState<string | null>(null);
  const inlineMsgTimerRef = useRef<number | null>(null);

  const [categories, setCategories] = useState<string[]>([]);


  const { todoItems, doneItems } = useMemo(() => {
  const todo = items
    .filter((i) => !i.done)
    .sort((a, b) => b.createdAt - a.createdAt);

  const done = items
    .filter((i) => i.done)
    .sort((a, b) => b.createdAt - a.createdAt);

  return { todoItems: todo, doneItems: done };
}, [items]);

const groupedTodo = useMemo(() => {
  const map: Record<string, Item[]> = {};

  for (const item of todoItems) {
    const key = item.category || "Övrigt";
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }

  return map;
}, [todoItems]);

const isAddDisabled =
  listsLoading || !!listsError || !activeListId || text.trim().length === 0;

  const fieldStyle: React.CSSProperties = {
    height: 40,
    padding: "8px 10px",
    border: "1px solid #eee",
    borderRadius: 12,
    fontSize: 14,
    outline: "none",
    background: "white",
  };

  const buttonStyle: React.CSSProperties = {
    height: 40,
    padding: "8px 10px",
    borderRadius: 12,
    border: "1px solid #eee",
    background: "white",
    fontWeight: 800,
    whiteSpace: "nowrap",
    cursor: "pointer",
  };

async function signInWithEmail() { 
  console.log('🔑 Försöker skicka kod...');
  const email = loginEmail.trim();
  console.log('📧 Email:', email);
  
  if (!email) {
    console.log('❌ Email är tom!');
    return;
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  console.log('📬 Supabase svar:', { error });

  if (error) {
    console.error('❌ Fel:', error);
    alert(error.message);
  } else {
    console.log('✅ Kod skickad!');
    alert("En 6-siffrig kod har skickats till din email ✅");
  }
}

async function verifyOtp() {
  const email = loginEmail.trim();
  const token = otpCode.trim();
  if (!email || !token) return;

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error) alert("Fel kod – försök igen");
}

async function loadOrCreateLists(userId: string) {
  // 1) hämta listor via join
  const { data, error } = await supabase
    .from("list_members")
    .select("lists(id,name)")
    .eq("user_id", userId);

  if (error) throw error;

  const rows = (data ?? [])
    .map((r: any) => r.lists)
    .filter(Boolean) as ListRow[];

  // 2) om inga listor -> skapa en default
  if (rows.length === 0) {
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const { data: newList, error: listErr } = await supabase
  .from("lists")
  .insert({ name: "Min lista", created_by: userId })
  .select("id,name")
  .single();

    if (listErr) throw listErr;

    const { error: memErr } = await supabase
      .from("list_members")
      .insert({ list_id: newList.id, user_id: userId, role: "owner" });

    if (memErr) throw memErr;

    return [newList] as ListRow[];
  }

  return rows;
}
async function deleteList() {
  if (!activeListId || lists.length <= 1) {
    showInlineMsg("Du måste ha minst en lista");
    return;
  }

  const confirmDelete = window.confirm("Är du säker på att du vill ta bort denna lista? Alla varor kommer raderas.");
  if (!confirmDelete) return;

  const { error } = await supabase
    .from("lists")
    .delete()
    .eq("id", activeListId);

  if (error) {
    console.error(error);
    showInlineMsg("Kunde inte ta bort listan");
    return;
  }

  // Uppdatera UI - byt till första kvarvarande listan
  const remaining = lists.filter(l => l.id !== activeListId);
  setLists(remaining);
  
  if (remaining.length > 0) {
    setActiveListId(remaining[0].id);
    localStorage.setItem("activeListId", remaining[0].id);
  }
  
  showInlineMsg("Lista borttagen ✅");
}

async function addItemFromValue(
  value: string,
  { focusAfter } = { focusAfter: true }
) {
  const trimmed = value.trim();
  if (!trimmed) return;
  if (!activeListId) {
  showInlineMsg("Vänta – laddar listor…");
  return;
}
  const norm = normalizeName(trimmed);

  // 1) Stoppa dubblett i TODO
  const existsTodo = items.some(
    (i) => !i.done && normalizeName(i.name) === norm
  );
  if (existsTodo) {
    setText("");
    setFiltered([]);
    setShowDropdown(false);
    showInlineMsg("Finns redan i listan");
    return;
  }

  // 2) Om den finns i KLART: återaktivera (DB-UPDATE)
  const doneMatch = items.find(
    (i) => i.done && normalizeName(i.name) === norm
  );
  if (doneMatch) {
    const category = await detectCategoryFromDB(trimmed.toLowerCase()) || "Övrigt";

    const { data, error } = await supabase
      .from("items")
      .update({
        done: false,
        name: trimmed,
        category: category,
      })
      .eq("id", doneMatch.id)
      .select("*")
      .single();

    if (error) {
      console.error(error);
      showInlineMsg("Kunde inte spara i databasen");
      return;
    }

    const next = items.map((i) =>
      i.id === doneMatch.id
        ? {
            ...i,
            done: data.done,
            name: data.name,
            category: data.category,
            createdAt: new Date(data.created_at).getTime(),
          }
        : i
    );

    setItems(next);
    setText("");
    setFiltered([]);
    setShowDropdown(false);

    focusAfterAddRef.current = focusAfter;
    setTimeout(() => {
      if (focusAfterAddRef.current) {
        inputRef.current?.focus();
        focusAfterAddRef.current = false;
      }
    }, 0);

    showInlineMsg("Klart – flyttad tillbaka");
    return;
  }

 const detectedCategory = await detectCategoryFromDB(trimmed.toLowerCase()) || "Övrigt";

// Om okänd kategori → visa popup
if (detectedCategory === "Övrigt") {
  setPendingItem({ name: trimmed });
  setCategoryPopupOpen(true);
  setText(""); // Rensa input
  return;
}

// Annars: skapa ny (DB-INSERT)
const row = {
  list_id: activeListId,
  name: trimmed,
  category: detectedCategory,
  done: false,
};

  const { data, error } = await supabase
    .from("items")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error(error);
    showInlineMsg("Kunde inte spara i databasen");
    return;
  }

  const newItem: Item = {
    id: data.id,
    name: data.name,
    category: data.category,
    done: data.done,
    createdAt: new Date(data.created_at).getTime(),
  };

  setItems((prev) => [newItem, ...prev]);
  setText("");
  setFiltered([]);
  setShowDropdown(false);

  focusAfterAddRef.current = focusAfter;
  setTimeout(() => {
    if (focusAfterAddRef.current) {
      inputRef.current?.focus();
      focusAfterAddRef.current = false;
    }
  }, 0);

  showUndo("Vara tillagd", { type: "add", item: newItem });
}

  function onPointerDown(id: string, e: React.PointerEvent) {
  if (editingId) return;

  // Klick på controls ska funka normalt
  const el = e.target as HTMLElement;
  if (el.closest("button, input, textarea, select")) return;

  draggingId.current = id;
  isSwipingRef.current = false;

  touchStartX.current = e.clientX;
  touchStartY.current = e.clientY;

  // start-läge: om redan öppnad, börja från -SWIPE_OPEN_PX annars 0
  const base = openId === id ? -SWIPE_OPEN_PX : 0;
  lastXRef.current[id] = base;
  setDragXById((m) => ({ ...m, [id]: base }));
}

function onPointerMove(id: string, e: React.PointerEvent) {
  if (editingId) return;
  if (draggingId.current !== id) return;
  if (touchStartX.current == null || touchStartY.current == null) return;

  const dx = e.clientX - touchStartX.current;
  const dy = e.clientY - touchStartY.current;

  // Vänta tills rörelsen är "på riktigt"
  if (!isSwipingRef.current) {
    // lite dödzon
    if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;

    // ser ut som scroll → avbryt swipe helt
    if (Math.abs(dy) > Math.abs(dx)) {
      draggingId.current = null;
      return;
    }

    // NU är det swipe → lås pointer capture EN gång
    isSwipingRef.current = true;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  }

  const base = openId === id ? -SWIPE_OPEN_PX : 0;
  let next = base + dx;

  if (next > 0) next = 0;
  if (next < -SWIPE_DELETE_THRESHOLD) next = -SWIPE_DELETE_THRESHOLD;

  lastXRef.current[id] = next;
pendingXRef.current = { id, x: next };

if (rafRef.current == null) {
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null;
    const p = pendingXRef.current;
    if (!p) return;
    setDragXById((m) => ({ ...m, [p.id]: p.x }));
  });
}
}

function onPointerUp(id: string, e: React.PointerEvent) {
  try {
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {}
  if (rafRef.current != null) {
  cancelAnimationFrame(rafRef.current);
  rafRef.current = null;
}
pendingXRef.current = null;
  if (editingId) return;

  const x = lastXRef.current[id] ?? dragXById[id] ?? 0;

  draggingId.current = null;
  isSwipingRef.current = false;
  touchStartX.current = null;
  touchStartY.current = null;

  if (x <= -SWIPE_DELETE_THRESHOLD) {
    deleteItem(id);
    return;
  }

  if (x <= -SWIPE_THRESHOLD) {
    setOpenId(id);
    setDragXById((m) => ({ ...m, [id]: -SWIPE_OPEN_PX }));
  } else {
    setOpenId(null);
    setDragXById((m) => ({ ...m, [id]: 0 }));
  }
}

function showInlineMsg(msg: string) {
  setInlineMsg(msg);

  if (inlineMsgTimerRef.current != null) {
    window.clearTimeout(inlineMsgTimerRef.current);
  }

  inlineMsgTimerRef.current = window.setTimeout(() => {
    setInlineMsg(null);
    inlineMsgTimerRef.current = null;
  }, 1800);
}

  function clearUndoTimer() {
    if (undoTimerRef.current != null) {
      window.clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  }

  function showUndo(message: string, action: UndoAction) {
  clearUndoTimer();
  setUndo({ message, action });

  undoTimerRef.current = window.setTimeout(() => {
    setUndo(null);
    undoTimerRef.current = null;
  }, TOAST_MS);
}

async function doUndo() {
  if (!undo) return;
  clearUndoTimer();

  const action = undo.action;
  setUndo(null);

  // krävs för vissa undo-actions (add/edit/toggle/delete), eftersom allt är kopplat till items-tabellen
  if (!activeListId) {
    showInlineMsg("Vänta – laddar listor…");
    return;
  }

  try {
    if (action.type === "add") {
      // Undo på "add" = ta bort itemet i DB + UI
      setItems((cur) => cur.filter((i) => i.id !== action.item.id));
      const { error } = await supabase.from("items").delete().eq("id", action.item.id);
      if (error) throw error;
      showInlineMsg("Ångrade: vara borttagen");
      return;
    }

    if (action.type === "delete") {
      // Undo på "delete" = återskapa item i DB + UI
      const row = {
        list_id: activeListId,
        name: action.item.name,
        category: action.item.category,
        done: action.item.done,
      };

      const { data, error } = await supabase.from("items").insert(row).select("*").single();
      if (error) throw error;

      const restored: Item = {
        id: data.id,
        name: data.name,
        category: data.category,
        done: data.done,
        createdAt: new Date(data.created_at).getTime(),
      };

      setItems((cur) => [restored, ...cur]);
      showInlineMsg("Ångrade: vara tillbaka");
      return;
    }

    if (action.type === "toggleDone") {
      // Undo på toggleDone = sätt tillbaka föregående done i DB + UI
      setItems((cur) => cur.map((i) => (i.id === action.id ? { ...i, done: action.prevDone } : i)));

      const { error } = await supabase
        .from("items")
        .update({ done: action.prevDone })
        .eq("id", action.id);

      if (error) throw error;

      showInlineMsg("Ångrade: status återställd");
      return;
    }

    if (action.type === "edit") {
      // Undo på edit = återställ name/category i DB + UI
      setItems((cur) =>
        cur.map((i) =>
          i.id === action.id ? { ...i, name: action.prev.name, category: action.prev.category } : i
        )
      );

      const { error } = await supabase
        .from("items")
        .update({ name: action.prev.name, category: action.prev.category })
        .eq("id", action.id);

      if (error) throw error;

      showInlineMsg("Ångrade: ändring återställd");
      return;
    }
  } catch (e) {
    console.error(e);
    showInlineMsg("Kunde inte ångra (DB-fel)");
  }
}

  async function toggleDone(id: string) {
  const target = items.find((i) => i.id === id);
  if (!target) return;

  const prevDone = target.done;      // ✅ behövs för Undo
  const nextDone = !target.done;     // ✅ behåll denna

  // 1) Optimistisk UI
  setItems((cur) =>
    cur.map((i) => (i.id === id ? { ...i, done: nextDone } : i))
  );

  // 2) Spara i DB
  const { error } = await supabase
    .from("items")
    .update({ done: nextDone })
    .eq("id", id);

  if (error) {
    console.error(error);
    // rollback UI
    setItems((cur) =>
      cur.map((i) => (i.id === id ? { ...i, done: prevDone } : i))
    );
    showInlineMsg("Kunde inte spara i databasen");
    return;
  }

  // ✅ Undo ska veta vad det var innan
  showUndo("Ändring sparad", { type: "toggleDone", id, prevDone });
}

async function inviteByEmail(email: string) {
  if (!activeListId) {
    showInlineMsg("Välj lista först");
    return;
  }

  const e = email.trim().toLowerCase();
  if (!e) return;

  // 1) hitta user_id via RPC
  const { data: userId, error: rpcErr } = await supabase
    .rpc("get_user_id_by_email", { p_email: e });

  if (rpcErr) {
    console.error(rpcErr);
    showInlineMsg("Kunde inte slå upp email");
    return;
  }

  if (!userId) {
    showInlineMsg("Ingen användare hittad. Be personen logga in först.");
    return;
  }

  // 2) lägg till i list_members (upsert för att undvika dubblett)
  const { error: insErr } = await supabase
    .from("list_members")
    .upsert(
      { list_id: activeListId, user_id: userId, role: "member" },
      { onConflict: "list_id,user_id" }
    );

  if (insErr) {
    console.error(insErr);
    showInlineMsg("Kunde inte dela listan");
    return;
  }

  showInlineMsg("Listan är delad ✅");
}

async function updateListName(newName: string) {
  if (!activeListId) return;
  
  const trimmed = newName.trim();
  if (!trimmed) {
    showInlineMsg("Listnamn kan inte vara tomt");
    return;
  }

  const { error } = await supabase
    .from("lists")
    .update({ name: trimmed })
    .eq("id", activeListId);

  if (error) {
    console.error(error);
    showInlineMsg("Kunde inte uppdatera listnamn");
    return;
  }

  // Uppdatera lokalt i UI
  setLists(prev => prev.map(l => 
    l.id === activeListId ? { ...l, name: trimmed } : l
  ));
  
  showInlineMsg("Listnamn uppdaterat ✅");
}

async function createNewList(name: string) {
  if (!session?.user?.id) return;
  
  const trimmed = name.trim();
  if (!trimmed) {
    showInlineMsg("Listnamn kan inte vara tomt");
    return;
  }

  // Skapa listan
  const { data: newList, error: listErr } = await supabase
    .from("lists")
    .insert({ name: trimmed, created_by: session.user.id })
    .select("id,name")
    .single();

  if (listErr) {
    console.error(listErr);
    showInlineMsg("Kunde inte skapa lista");
    return;
  }

  // Lägg till användaren som medlem
  const { error: memErr } = await supabase
    .from("list_members")
    .insert({ list_id: newList.id, user_id: session.user.id, role: "owner" });

  if (memErr) {
    console.error(memErr);
    showInlineMsg("Kunde inte lägga till dig i listan");
    return;
  }

  // Uppdatera UI
  setLists(prev => [...prev, newList]);
  setActiveListId(newList.id);
  localStorage.setItem("activeListId", newList.id);
  
  showInlineMsg("Lista skapad ✅");
}

  function startEditing(item: Item) {
    setOpenId(null);
    setEditingId(item.id);
    setEditingText(item.name);
    setShowDropdown(false);
    setFiltered([]);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingText("");
  }

  async function saveEditing(id: string) {
  const trimmed = editingText.trim();
  if (!trimmed) return;

    const before = items.find((i) => i.id === id);
  if (!before) return;

  const prevForUndo = { name: before.name, category: before.category };

  if (!activeListId) {
    showInlineMsg("Vänta – laddar listor…");
    return;
  }

  const norm = normalizeName(trimmed);

  // 1) Stoppa dubblett i TODO (förutom itemet vi redigerar)
  const existsTodo = items.some(
    (i) => i.id !== id && !i.done && normalizeName(i.name) === norm
  );
  if (existsTodo) {
    showInlineMsg("Finns redan i listan");
    return;
  }

  // 2) Om den finns i KLART: återaktivera den och ta bort vår redigerade
  const existsDone = items.find(
    (i) => i.id !== id && i.done && normalizeName(i.name) === norm
  );
  if (existsDone) {

    const cat1 = await detectCategoryFromDB(trimmed.toLowerCase()) || "Övrigt";
    // a) sätt KLART-itemet till todo + uppdatera namn/kategori
    const { error: upErr } = await supabase
      .from("items")
      .update({ done: false, name: trimmed, category: cat1 })
      .eq("id", existsDone.id);

    if (upErr) {
      console.error(upErr);
      showInlineMsg("Kunde inte spara i databasen");
      return;
    }

    // b) ta bort itemet vi höll på att redigera (för att undvika dubblett)
    const { error: delErr } = await supabase.from("items").delete().eq("id", id);

    if (delErr) {
      console.error(delErr);
      showInlineMsg("Kunde inte ta bort dubbletten i databasen");
      return;
    }

    const category = await detectCategoryFromDB(trimmed.toLowerCase()) || "Övrigt";

    // UI
    const next = items
      .map((i) =>
        i.id === existsDone.id
          ? { ...i, done: false, name: trimmed, category: category, createdAt: Date.now() }
          : i
      )
      .filter((i) => i.id !== id);

    setItems(next);
    cancelEditing();
    showUndo("Tillbaka på listan", { type: "toggleDone", id: existsDone.id, prevDone: true });
    return;
  }

  const cat2 = await detectCategoryFromDB(trimmed.toLowerCase()) || "Övrigt";

  // 3) Normal edit: uppdatera i DB + state
  const { data, error } = await supabase
    .from("items")
    .update({ name: trimmed, category: cat2 })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error(error);
    showInlineMsg("Kunde inte spara i databasen");
    return;
  }

  setItems((cur) =>
    cur.map((i) =>
      i.id === id
        ? {
            ...i,
            name: data.name,
            category: data.category,
            done: data.done,
            createdAt: new Date(data.created_at).getTime(),
          }
        : i
    )
  );

  cancelEditing();
  showUndo("Ändring sparad", { type: "edit", id, prev: prevForUndo });
}

  async function deleteItem(id: string) {
  const target = items.find((i) => i.id === id);
  if (!target) return;

  // 1) Optimistisk UI
  setItems((cur) => cur.filter((item) => item.id !== id));

  setOpenId(null);
  setDragXById((m) => {
    const copy = { ...m };
    delete copy[id];
    return copy;
  });

  // 2) Spara i DB
  const { error } = await supabase.from("items").delete().eq("id", id);

  if (error) {
    console.error(error);
    // rollback (lägg tillbaka)
    setItems((cur) => [target, ...cur]);
    showInlineMsg("Kunde inte ta bort i databasen");
    return;
  }

  // ✅ Viktigt: skicka delete-action med hela itemet (inkl done=true om den låg i Klart)
  showUndo("Vara borttagen", { type: "delete", item: target });
}

  async function onSubmit(e: React.FormEvent) {
  e.preventDefault();

  if (!activeListId) {
    showInlineMsg("Vänta – laddar listor…");
    return;
  }

  await addItemFromValue(text, { focusAfter: true });
}

  // Ladda suggestions.txt (ligger i /public)
  useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    
    setSession(data.session);
  });

  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    
    setSession(newSession);
  });

  return () => {
    sub.subscription.unsubscribe();
  };
}, []);

  useEffect(() => {
  if (!session?.user?.id) return;

  (async () => {
    try {
      setListsError(null);
      setListsLoading(true);

      const userId = session.user.id;
      const ls = await loadOrCreateLists(userId);

      setLists(ls);

      const saved = localStorage.getItem("activeListId");
      const okSaved = saved && ls.some((x) => x.id === saved);

      const nextId = okSaved ? saved : (ls[0]?.id ?? null);
      setActiveListId(nextId);

      if (!nextId) {
        setListsError("Kunde inte välja en aktiv lista (nextId blev null).");
      }
    } catch (e: any) {
      console.error(e);
      setListsError(e?.message ?? "Kunde inte ladda listor.");
    } finally {
      setListsLoading(false);
    }
  })();
}, [session?.user?.id]);

  useEffect(() => {
  if (!activeListId) return;

  (async () => {
    const { data, error } = await supabase
      .from("items")
      .select("*")
      .eq("list_id", activeListId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // mappa till din Item-typ om du vill:
    const next = (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      done: r.done,
      createdAt: new Date(r.created_at).getTime(),
    }));

    setItems(next);
  })().catch(console.error);
}, [activeListId]);

  useEffect(() => {
  return () => {
    if (inlineMsgTimerRef.current != null) {
      window.clearTimeout(inlineMsgTimerRef.current);
    }
  };
}, []);

  // Filtrera förslag när text ändras
  useEffect(() => {
    const q = text.trim().toLowerCase();
    if (!q) {
      setFiltered([]);
      setShowDropdown(false);
      return;
    }

    // max 8 förslag
    const starts = suggestions.filter((s) => s.toLowerCase().startsWith(q));
    const contains = suggestions.filter(
      (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q)
    );

    const next = [...starts, ...contains].slice(0, 8);
    setFiltered(next);
    setShowDropdown(next.length > 0);
  }, [text, suggestions]);

  // Stäng swipe när man trycker utanför (men inte mitt i redigering)
  useEffect(() => {
    function onDocPointerDown() {
  if (editingId) return;
  if (draggingId.current) return; // ✅ NY: stäng inte swipe medan du drar
  setOpenId(null);
}
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
    };
  }, [editingId]);

  // Stäng dropdown om man klickar utanför
  useEffect(() => {
    function onDocDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (draggingId.current) return;
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(target)) return;
      setShowDropdown(false);
    }
    document.addEventListener("mousedown", onDocDown);
    document.addEventListener("touchstart", onDocDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      document.removeEventListener("touchstart", onDocDown);
    };
  }, []);

  useEffect(() => {
  // Hämta alla unika kategorier från databasen
  async function loadCategories() {
    const { data } = await supabase
      .from('ingredients')
      .select('category')
      .eq('approved', true);
    
    if (data) {
      const unique = [...new Set(data.map(d => d.category))];
      setCategories(unique);
    }
  }
  loadCategories();
}, []);

  function getX(id: string) {
  if (dragXById[id] != null) return dragXById[id];
  return openId === id ? -SWIPE_OPEN_PX : 0;
  }

  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "44px 18px 100px" }}>
      <div style={{ marginBottom: 20 }}>
  <div style={{ fontSize: 11, color: "#bbb", fontWeight: 500, letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 4 }}>
    Mina hushållslistor
  </div>
</div>
      {!session ? (
  <>
    <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
  <input
    value={loginEmail}
    onChange={(e) => setLoginEmail(e.target.value)}
    placeholder="Din email"
    style={{
      flex: 1,
      padding: "12px 12px",
      border: "1px solid #d6d6d6",
      borderRadius: 14,
      fontSize: 16,
      outline: "none",
    }}
  />
  <button
    type="button"
    onClick={signInWithEmail}
    style={{
      padding: "12px 14px",
      borderRadius: 14,
      border: "1px solid #d6d6d6",
      background: "white",
      cursor: "pointer",
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}
  >
    Skicka kod
  </button>
</div>

{/* Det här dyker upp när man skrivit sin email och tryckt "Skicka kod" */}
{loginEmail.trim().length > 0 && (
  <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
    <input
      value={otpCode}
      onChange={(e) => setOtpCode(e.target.value)}
      placeholder="Skriv din 6-siffriga kod"
      maxLength={6}
      style={{
        flex: 1,
        padding: "12px 12px",
        border: "1px solid #d6d6d6",
        borderRadius: 14,
        fontSize: 16,
        outline: "none",
      }}
    />
    <button
      type="button"
      onClick={verifyOtp}
      style={{
        padding: "12px 14px",
        borderRadius: 14,
        border: "1px solid #d6d6d6",
        background: "white",
        cursor: "pointer",
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      Logga in
    </button>
  </div>
)}

<p style={{ color: "#666", marginTop: 8 }}>
  Logga in för att se och synka din lista.
</p>

  </>
) : (
  <>
    {/* INPUT + DROPDOWN */}
    <div ref={dropdownRef} style={{ position: "relative" }}>
    {listsLoading && (
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 700, color: "#666" }}>
      Laddar listor…
    </div>
  )}

  {listsError && (
    <div style={{ marginBottom: 8, fontSize: 13, fontWeight: 800, color: "#b91c1c" }}>
      Fel: {listsError}
    </div>
  )}
   <div style={{ marginBottom: 8 }}>
  {/* Rad 1: Lista + Redigera + Ta bort */}
  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
    <select
      value={activeListId ?? ""}
      onChange={(e) => {
        const id = e.target.value;
        setActiveListId(id);
        localStorage.setItem("activeListId", id);
      }}
      style={{
        flex: 1,
        padding: "8px 10px",
        borderRadius: 12,
        border: "1px solid #d6d6d6",
        background: "white",
        fontWeight: 700,
      }}
      disabled={lists.length === 0}
    >
      {lists.length === 0 ? (
        <option value="">Laddar listor...</option>
      ) : (
        lists.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))
      )}
    </select>

    <button
      type="button"
      onClick={() => {
        const currentList = lists.find(l => l.id === activeListId);
        if (currentList) {
          setEditListName(currentList.name);
          setEditListOpen(true);
        }
      }}
      style={{
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #d6d6d6",
        background: "white",
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      ✏️
    </button>

    <button
      type="button"
      onClick={deleteList}
      disabled={lists.length <= 1}
      style={{
        padding: "6px 8px",
        borderRadius: 8,
        border: "1px solid #d6d6d6",
        background: lists.length <= 1 ? "#f5f5f5" : "white",
        cursor: lists.length <= 1 ? "not-allowed" : "pointer",
        fontSize: 14,
        opacity: lists.length <= 1 ? 0.5 : 1,
      }}
    >
      🗑️
    </button>
  </div>

  {/* Rad 2: Dela + Ny lista */}
  <div style={{ display: "flex", gap: 8 }}>
    <button
      type="button"
      onClick={() => setShareOpen(true)}
      style={{
        ...buttonStyle,
        flex: 1,
        height: 40,
        borderRadius: 14,
        border: "1px solid #d6d6d6",
        fontSize: 14,
      }}
    >
      Dela
    </button>

    <button
      type="button"
      onClick={() => {
        setNewListName("");
        setCreateListOpen(true);
      }}
      style={{
        ...buttonStyle,
        flex: 1,
        height: 40,
        borderRadius: 14,
        border: "1px solid #d6d6d6",
        fontSize: 14,
      }}
    >
      + Ny lista
    </button>
  </div>
</div>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8 }}>
  <input
    ref={inputRef}
    value={text}
    onChange={(e) => {
      setText(e.target.value);
      if (inlineMsg) setInlineMsg(null);
    }}
    onFocus={() => {
      if (filtered.length > 0) setShowDropdown(true);
    }}
    placeholder="Lägg till vara…"
    style={{
      flex: 1,
      height: 48,
      padding: "0 16px",
      border: "1.5px solid #ede9e2",
      borderRadius: 14,
      fontSize: 16,
      outline: "none",
      background: "#fff",
      fontFamily: "'DM Sans', sans-serif",
      color: "#1a1a1a",
    }}
  />

  <button
    type="submit"
    disabled={isAddDisabled}
    style={{
      height: 48,
      width: 48,
      borderRadius: 14,
      border: "none",
      background: isAddDisabled ? "#ddd" : "#3d3530",
      color: "#f7f4ef",
      cursor: isAddDisabled ? "not-allowed" : "pointer",
      fontWeight: 700,
      fontSize: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    +
  </button>
</form>
      {inlineMsg && (
  <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#b45309" }}>
    {inlineMsg}
   </div> 
)}
   {showDropdown && filtered.length > 0 && (
          <div
            style={{
              position: "absolute",
              zIndex: 50,
              left: 0,
              right: 0,
              top: "calc(100% + 8px)",
              border: "1px solid #e6e6e6",
              borderRadius: 14,
              background: "white",
              boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
              overflow: "hidden",
            }}
          >
            {filtered.map((s) => (
              <button
                key={s}
                type="button"
                onClick={async () => {
                  await addItemFromValue(s, { focusAfter: false });
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "12px 12px",
                  border: "none",
                  background: "white",
                  cursor: "pointer",
                  fontSize: 16,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
  </div>
      {/* LISTA */}
        <section style={{ marginTop: 16 }}>
  {todoItems.length === 0 ? (
    <p style={{ color: "#666" }}>Inget mer att handla.</p>
  ) : (
    <div>
      {Object.entries(groupedTodo).map(([category, list]) => (
        <div key={category} style={{ marginTop: 14 }}>
          <div
  style={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#9e9790",
    marginBottom: 6,
    marginTop: 18,
    display: "flex",
    alignItems: "center",
    gap: 6,
  }}
>
  <span>{category}</span>
  <span style={{
    background: "#ede9e2",
    color: "#9e9790",
    fontSize: 10,
    fontWeight: 600,
    padding: "1px 6px",
    borderRadius: 20,
  }}>
    {list.length}
  </span>
</div>

          <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
            {list.map((item) => (
              <li key={item.id} style={{ listStyle: "none", marginBottom: 8 }}>
  <div style={{ position: "relative" }}>
    {/* Bakre layer: delete-knapp */}
    <div
  style={{
    position: "absolute",
    inset: 0,                 // täcker hela raden (samma höjd)
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingRight: 10,         // matchar radens padding-känsla
    borderRadius: 12,
    border: "1px solid #fecdd3",
    background: "#fff1f2",
    pointerEvents: "none",
  }}
>
      <button
        type="button"
        onClick={() => { void deleteItem(item.id); }}
        aria-label="Ta bort"
        title="Ta bort"
        style={{
  border: "none",
  background: "transparent",
  borderRadius: 9,
  color: "#9f1239",
  width: 30,
  height: 30,
  cursor: "pointer",
  fontSize: 18,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  pointerEvents: "auto",
}}
      >
        🗑️
      </button>
    </div>

    {/* Främre layer: själva raden som swipas */}
    <div
  onPointerDown={(e) => onPointerDown(item.id, e)}
  onPointerMove={(e) => onPointerMove(item.id, e)}
  onPointerUp={(e) => onPointerUp(item.id, e)}
  onPointerCancel={(e) => onPointerUp(item.id, e)}
  style={{
    transform: `translateX(${getX(item.id)}px)`,
    willChange: "transform",
    transition: draggingId.current === item.id ? "none" : "transform 160ms ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    border: "1px solid #ede9e2",
    borderRadius: 12,
    background: "#fff",
    touchAction: "pan-y",
    userSelect: "none",
    WebkitUserSelect: "none",
  }}
>
      
      <label
  style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, cursor: "pointer" }}
  onClick={() => { void toggleDone(item.id); }}
>
  <div
    style={{
      width: 20,
      height: 20,
      minWidth: 20,
      borderRadius: "50%",
      border: item.done ? "none" : "1.5px solid #c8c2b8",
      background: item.done ? "#3d3530" : "transparent",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      pointerEvents: "none",
    }}
  >
    {item.done && (
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 3.5L3.5 6.5L9 1" stroke="#f7f4ef" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )}
  </div>

  {editingId === item.id ? (
          <input
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") { void saveEditing(item.id); }
              if (e.key === "Escape") cancelEditing();
            }}
            style={{
              flex: 1,
              padding: "6px 8px",
              border: "1px solid #ccc",
              borderRadius: 12,
              fontSize: 16,
            }}
          />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 650 }}>{item.name}</span>
        )}
      </label>

      {editingId === item.id ? (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => { void saveEditing(item.id); }}
            aria-label="Spara"
            title="Spara"
            style={{
  border: "none",
  background: "#3d3530",
  borderRadius: 9,
  width: 30,
  height: 30,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#f7f4ef",
}}
>
  <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
    <path d="M1 5L4.5 8.5L11 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
          </button>

          <button
            type="button"
            onClick={cancelEditing}
            aria-label="Avbryt"
            title="Avbryt"
            style={{
  border: "1px solid #ede9e2",
  background: "white",
  borderRadius: 9,
  width: 30,
  height: 30,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9e9790",
}}
>
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
    <path d="M1 1L10 10M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => startEditing(item)}
            aria-label="Redigera"
            title="Redigera"
            style={{
  border: "1px solid #ede9e2",
  background: "white",
  borderRadius: 9,
  width: 30,
  height: 30,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#9e9790",
}}
>
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <path d="M9 2L11 4L4 11H2V9L9 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
          </button>
        </div>
      )}
    </div>
  </div>
</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )}
</section>

          {/* KLART */}
          <section style={{ marginTop: 24 }}>
  <div style={{
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    color: "#9e9790",
    marginBottom: 6,
    display: "flex",
    alignItems: "center",
    gap: 6,
  }}>
    <span>Klart</span>
    <span style={{
      background: "#ede9e2",
      color: "#9e9790",
      fontSize: 10,
      fontWeight: 600,
      padding: "1px 6px",
      borderRadius: 20,
    }}>
      {doneItems.length}
    </span>
  </div>

            {doneItems.length === 0 ? (
              <p style={{ color: "#888", marginTop: 6 }}>Inget handlat än.</p>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                {doneItems.map((item) => (
                  <li
  key={item.id}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 12px",
    border: "1px solid #ede9e2",
    borderRadius: 12,
    background: "#f7f4ef",
    marginBottom: 5,
    opacity: 0.6,
  }}
>
  <label style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
    <div
      onClick={() => { void toggleDone(item.id); }}
      style={{
        width: 20,
        height: 20,
        minWidth: 20,
        borderRadius: "50%",
        background: "#3d3530",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
        <path d="M1 3.5L3.5 6.5L9 1" stroke="#f7f4ef" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
    <span style={{ fontSize: 14, color: "#9e9790", textDecoration: "line-through" }}>
      {item.name}
    </span>
  </label>

                    <button
                      type="button"
                      onClick={() => { void deleteItem(item.id); }}
                      aria-label="Ta bort"
                      title="Ta bort"
                      style={{
                        border: "1px solid #ddd",
                        background: "white",
                        borderRadius: 10,
                        width: 30,
                        height: 30,
                        cursor: "pointer",
                        fontWeight: 900,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        lineHeight: 1,
                      }}
                    >
                      🗑️
                    </button>
                  </li>
                ))}
              </ul>
            )}
            </section>
      {/* UNDO TOAST */}
      {undo && (
  <div
    style={{
      position: "fixed",
      left: 16,
      right: 16,
      bottom: 90,
      maxWidth: 560,
      margin: "0 auto",
      borderRadius: 14,
      background: "#3d3530",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      boxShadow: "0 8px 28px rgba(0,0,0,0.15)",
    }}
  >
    <div style={{ fontSize: 13, color: "#c8c2b8" }}>
      {undo.message}
    </div>
    <button
      type="button"
      onClick={doUndo}
      style={{
        border: "none",
        background: "#f7f4ef",
        color: "#3d3530",
        borderRadius: 8,
        padding: "6px 14px",
        cursor: "pointer",
        fontWeight: 600,
        fontSize: 13,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      Ångra
    </button>
  </div>
)}

      {/* KATEGORI-POPUP */}
{categoryPopupOpen && pendingItem && (
  <div
      onClick={() => {
      setCategoryPopupOpen(false);
      setPendingItem(null);
    }}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
    }}
  >
    <div
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 420,
        background: "white",
        borderRadius: 14,
        border: "1px solid #ddd",
        padding: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Välj kategori</div>
      <p style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
        "{pendingItem.name}" – vilken kategori passar bäst?
      </p>

      <div style={{ 
        display: "flex",
        flexDirection: "column",
        gap: 8,
        maxHeight: "60vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch"
      }}>
        
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={async () => {
              // 1) Spara ingrediensen i databasen (förslag, väntar på godkännande)
              await supabase
                .from('ingredients')
                .upsert({ 
                  name: pendingItem.name.toLowerCase(), 
                  category: category
                }, { 
                  onConflict: 'name' 
                });

              // 2) Lägg till i användarens lista
              const row = {
                list_id: activeListId!,
                name: pendingItem.name,
                category: category,
                done: false,
              };

              const { data, error } = await supabase
                .from("items")
                .insert(row)
                .select("*")
                .single();

              if (error) {
                console.error(error);
                showInlineMsg("Kunde inte spara i databasen");
                return;
              }

              const newItem: Item = {
                id: data.id,
                name: data.name,
                category: data.category,
                done: data.done,
                createdAt: new Date(data.created_at).getTime(),
              };

              setItems((prev) => [newItem, ...prev]);
              setCategoryPopupOpen(false);
              setPendingItem(null);
              showUndo("Vara tillagd", { type: "add", item: newItem });
            }}
           style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid #ede9e2",
              background: "white",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 14,
              textAlign: "left",
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => {
            setCategoryPopupOpen(false);
            setPendingItem(null);
          }}
          style={buttonStyle}
        >
          Avbryt
        </button>
      </div>
    </div>
  </div>
)}
{/* REDIGERA LISTA-POPUP */}
{editListOpen && (
  <div
    onClick={() => setEditListOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 420,
        background: "white",
        borderRadius: 14,
        border: "1px solid #ddd",
        padding: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Redigera lista</div>

      <input
        autoFocus
        value={editListName}
        onChange={(e) => setEditListName(e.target.value)}
        placeholder="Listnamn"
        style={{ ...fieldStyle, width: "100%", fontSize: 16 }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setEditListOpen(false);
          if (e.key === "Enter") {
            e.preventDefault();
            void updateListName(editListName);
            setEditListOpen(false);
          }
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setEditListOpen(false)}
          style={buttonStyle}
        >
          Avbryt
        </button>

        <button
          type="button"
          onClick={() => {
            void updateListName(editListName);
            setEditListOpen(false);
          }}
          style={buttonStyle}
        >
          Spara
        </button>
      </div>
    </div>
  </div>
)}
{/* SKAPA NY LISTA-POPUP */}
{createListOpen && (
  <div
    onClick={() => setCreateListOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 420,
        background: "white",
        borderRadius: 14,
        border: "1px solid #ddd",
        padding: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Skapa ny lista</div>

      <input
        autoFocus
        value={newListName}
        onChange={(e) => setNewListName(e.target.value)}
        placeholder="Namn på lista"
        style={{ ...fieldStyle, width: "100%", fontSize: 16 }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setCreateListOpen(false);
          if (e.key === "Enter") {
            e.preventDefault();
            void createNewList(newListName);
            setCreateListOpen(false);
          }
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setCreateListOpen(false)}
          style={buttonStyle}
        >
          Avbryt
        </button>

        <button
          type="button"
          onClick={() => {
            void createNewList(newListName);
            setCreateListOpen(false);
          }}
          style={buttonStyle}
        >
          Skapa
        </button>
      </div>
    </div>
  </div>
)}
      {shareOpen && (
  <div
    onMouseDown={() => setShareOpen(false)}
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.35)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
    }}
  >
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        width: "100%",
        maxWidth: 420,
        background: "white",
        borderRadius: 14,
        border: "1px solid #ddd",
        padding: 14,
        boxShadow: "0 10px 30px rgba(0,0,0,0.20)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Dela lista</div>

      <input
        autoFocus
        value={shareEmail}
        onChange={(e) => setShareEmail(e.target.value)}
        placeholder="E-postadress"
        style={{ ...fieldStyle, width: "100%", fontSize: 16 }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setShareOpen(false);
          if (e.key === "Enter") {
            e.preventDefault();
            const email = shareEmail.trim();
            if (!email) return;
            void inviteByEmail(email);
            setShareEmail("");
            setShareOpen(false);
          }
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
        <button
          type="button"
          onClick={() => setShareOpen(false)}
          style={buttonStyle}
        >
          Avbryt
        </button>

        <button
          type="button"
          onClick={() => {
            const email = shareEmail.trim();
            if (!email) return;
            void inviteByEmail(email);
            setShareEmail("");
            setShareOpen(false);
          }}
          style={buttonStyle}
        >
          Dela
        </button>
      </div>
    </div>
  </div>
)}

      </>
)}
    </main>
  );  
}