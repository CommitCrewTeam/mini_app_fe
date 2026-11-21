// Seed accounts. admin@example.com / user@example.com are the
// required test accounts from the assessment brief.
// NOTE: Storing plaintext passwords is only acceptable here because
// this is a mock, offline authentication system for a learning project.
// A real application would never store or compare passwords like this.

export const seedUsers = [
  {
    id: "u_001",
    name: "Amir Khan",
    email: "admin@example.com",
    password: "Admin@123",
    role: "admin",
    status: "active",
    joinedAt: "2024-01-12",
  },
  {
    id: "u_002",
    name: "Sara Malik",
    email: "user@example.com",
    password: "User@123",
    role: "user",
    status: "active",
    joinedAt: "2024-03-05",
  },
  {
    id: "u_003",
    name: "Hassan Raza",
    email: "hassan.raza@example.com",
    password: "User@123",
    role: "user",
    status: "active",
    joinedAt: "2024-04-18",
  },
  {
    id: "u_004",
    name: "Ayesha Siddiqui",
    email: "ayesha.s@example.com",
    password: "User@123",
    role: "admin",
    status: "active",
    joinedAt: "2023-11-02",
  },
  {
    id: "u_005",
    name: "Bilal Ahmed",
    email: "bilal.ahmed@example.com",
    password: "User@123",
    role: "user",
    status: "inactive",
    joinedAt: "2024-06-21",
  },
  {
    id: "u_006",
    name: "Fatima Noor",
    email: "fatima.noor@example.com",
    password: "User@123",
    role: "user",
    status: "active",
    joinedAt: "2024-02-27",
  },
];

const USERS_KEY = "auth_dashboard_users";

// Reads users from Local Storage. If none exist yet (first run),
// it seeds Local Storage with the default list above.
export function getStoredUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) {
    localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.setItem(USERS_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
}

// Overwrites the full user list in Local Storage.
export function saveStoredUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Adds a single new user (used by Register) and persists it.
export function addStoredUser(user) {
  const users = getStoredUsers();
  const updated = [...users, user];
  saveStoredUsers(updated);
  return updated;
}

// Updates a single existing user by id (used by Profile edits)
// and persists the change.
export function updateStoredUser(id, patch) {
  const users = getStoredUsers();
  const updated = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
  saveStoredUsers(updated);
  return updated;
}
