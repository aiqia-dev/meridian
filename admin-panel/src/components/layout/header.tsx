"use client";

import { useEffect, useState } from "react";
import { Bell, User } from "lucide-react";

export function Header() {
  const [username, setUsername] = useState("");

  useEffect(() => {
    const user = localStorage.getItem("meridian_user");
    if (user) {
      setUsername(user);
    }
  }, []);

  return (
    <div className="flex-1 flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Geospatial Database Administration</h2>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 rounded-md hover:bg-accent transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-accent">
          <User className="w-4 h-4" />
          <span className="text-sm font-medium">{username || "Admin"}</span>
        </div>
      </div>
    </div>
  );
}
