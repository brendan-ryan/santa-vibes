"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import UserForm from "./user-form";
import { deleteUser } from "./actions";

type UserRow = {
  id: string;
  name: string;
  displayName: string | null;
  email: string;
  role: Role;
};

type Props = {
  users: UserRow[];
  currentUserId: string;
};

export default function UserList({ users, currentUserId }: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(user: UserRow) {
    const label = user.displayName ?? user.name;
    if (!confirm(`Delete ${label}? This will also remove their wishlist.`)) return;
    setDeletingId(user.id);
    await deleteUser(user.id);
    router.refresh();
    setDeletingId(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Users</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-red-700 text-white text-sm font-semibold rounded-lg hover:bg-red-800 transition-colors"
        >
          Add user
        </button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-white rounded-lg border border-zinc-200 px-4 py-3 flex items-center gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-zinc-900">
                  {user.displayName ?? user.name}
                </span>
                {user.displayName && (
                  <span className="text-sm text-zinc-500 hidden sm:inline">
                    ({user.name})
                  </span>
                )}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    user.role === "ADMIN"
                      ? "bg-red-100 text-red-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {user.role === "ADMIN" ? "Admin" : "Member"}
                </span>
              </div>
              <p className="text-sm text-zinc-500 truncate">{user.email}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setEditingUser(user)}
                className="text-sm text-zinc-600 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
              >
                Edit
              </button>
              {user.id !== currentUserId && (
                <button
                  onClick={() => handleDelete(user)}
                  disabled={deletingId === user.id}
                  className="text-sm text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === user.id ? "…" : "Delete"}
                </button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <p className="text-center text-zinc-500 py-12">No users yet. Add one above.</p>
        )}
      </div>

      {showCreate && <UserForm onClose={() => setShowCreate(false)} />}
      {editingUser && <UserForm user={editingUser} onClose={() => setEditingUser(null)} />}
    </>
  );
}
