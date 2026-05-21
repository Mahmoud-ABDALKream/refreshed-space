"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  ShieldCheck,
  Send,
  LogOut,
  Lock,
  KeyRound,
  UserPlus,
  LogIn,
  MessageSquare,
  ArrowRight,
  Eye,
  EyeOff,
  Users,
  RefreshCw,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

// Types
interface UserInfo {
  id: string;
  username: string;
  publicKey: string;
  createdAt: string;
}

interface MessageInfo {
  id: string;
  sender: { id: string; username: string };
  receiver: { id: string; username: string };
  ciphertext: string;
  plaintext: string | null;
  encryptionType: string;
  createdAt: string;
}

const SESSION_KEY = "securechat_session";

function getStoredSession(): UserInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) return JSON.parse(stored) as UserInfo;
  } catch {
    localStorage.removeItem(SESSION_KEY);
  }
  return null;
}

export default function SecureMessagingApp() {
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<MessageInfo[]>([]);
  const [sentMessages, setSentMessages] = useState<MessageInfo[]>([]);

  // Registration form
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Login form
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Compose message
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [messageText, setMessageText] = useState("");

  // UI states
  const [loading, setLoading] = useState(false);
  const [showCiphertext, setShowCiphertext] = useState<Record<string, boolean>>({});
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  const { toast } = useToast();

  // Fetch users for a given userId
  const fetchUsers = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/users?excludeUserId=${userId}`);
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
  }, []);

  // Fetch messages for a given userId
  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const [receivedRes, sentRes] = await Promise.all([
        fetch(`/api/messages?userId=${userId}&type=received&decrypt=true`),
        fetch(`/api/messages?userId=${userId}&type=sent`),
      ]);
      const receivedData = await receivedRes.json();
      const sentData = await sentRes.json();
      if (receivedData.messages) setReceivedMessages(receivedData.messages);
      if (sentData.messages) setSentMessages(sentData.messages);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  }, []);

  // Load all dashboard data for a given user
  const loadDashboard = useCallback(async (userId: string) => {
    await Promise.all([fetchUsers(userId), fetchMessages(userId)]);
  }, [fetchUsers, fetchMessages]);

  // Restore session from localStorage on mount — reading from an external store (localStorage)
  // and syncing to React state is the intended use of effects per React docs
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setCurrentUser(stored);
      loadDashboard(stored.id);
    }
    setSessionLoaded(true);
  }, [loadDashboard]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: regUsername, password: regPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Registration Failed", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "Registration Successful",
          description: `Welcome, ${data.user.username}! You can now log in.`,
        });
        setRegUsername("");
        setRegPassword("");
        setAuthMode("login");
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setLoading(false);
  };

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Login Failed", description: data.error, variant: "destructive" });
      } else {
        // Save session to localStorage
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
        setCurrentUser(data.user);
        setLoginUsername("");
        setLoginPassword("");
        loadDashboard(data.user.id);
        toast({ title: "Welcome back!", description: `Logged in as ${data.user.username}` });
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setLoading(false);
  };

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedReceiver || !messageText.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          receiverId: selectedReceiver,
          plaintext: messageText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Send Failed", description: data.error, variant: "destructive" });
      } else {
        toast({
          title: "Message Sent",
          description: "Your message was encrypted and sent successfully.",
        });
        setMessageText("");
        if (currentUser) fetchMessages(currentUser.id);
      }
    } catch {
      toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleLogout = () => {
    // Clear session from localStorage
    localStorage.removeItem(SESSION_KEY);
    setCurrentUser(null);
    setUsers([]);
    setReceivedMessages([]);
    setSentMessages([]);
    setSelectedReceiver("");
    setMessageText("");
    toast({ title: "Logged Out", description: "You have been logged out." });
  };

  const toggleCiphertext = (msgId: string) => {
    setShowCiphertext((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString();
  };

  const selectedUser = users.find((u) => u.id === selectedReceiver);

  // ── LOADING SCREEN (session restore) ────────────────────────────────
  if (!sessionLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Restoring session...</span>
        </div>
      </div>
    );
  }

  // ── AUTH SCREEN ──────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight">SecureChat</h1>
              <p className="text-muted-foreground">
                End-to-end encrypted messaging with RSA-2048
              </p>
            </div>

            <Tabs
              value={authMode}
              onValueChange={(v) => setAuthMode(v as "login" | "register")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="gap-2">
                  <LogIn className="w-4 h-4" /> Login
                </TabsTrigger>
                <TabsTrigger value="register" className="gap-2">
                  <UserPlus className="w-4 h-4" /> Register
                </TabsTrigger>
              </TabsList>

              {/* LOGIN TAB */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Welcome Back</CardTitle>
                    <CardDescription>
                      Enter your credentials to access your encrypted messages
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-user">Username</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-user"
                            placeholder="Enter username"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-pass">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-pass"
                            type="password"
                            placeholder="Enter password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? "Signing in..." : "Sign In"}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create Account</CardTitle>
                    <CardDescription>
                      Register to start sending encrypted messages. An RSA-2048 key pair
                      will be generated for you.
                    </CardDescription>
                  </CardHeader>
                  <form onSubmit={handleRegister}>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-user">Username</Label>
                        <div className="relative">
                          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-user"
                            placeholder="Choose a username (min 3 chars)"
                            value={regUsername}
                            onChange={(e) => setRegUsername(e.target.value)}
                            className="pl-9"
                            required
                            minLength={3}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reg-pass">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="reg-pass"
                            type="password"
                            placeholder="Choose a password (min 6 chars)"
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="pl-9"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                      <div className="rounded-lg bg-muted/50 border p-3 space-y-1.5 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-green-600" />
                          <span>Password hashed with <strong>bcrypt</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-4 h-4 text-green-600" />
                          <span>RSA-2048 key pair auto-generated</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-green-600" />
                          <span>Messages encrypted with hybrid RSA-OAEP + AES-256-CBC</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full gap-2" disabled={loading}>
                        {loading ? "Creating account..." : "Create Account"}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </CardFooter>
                  </form>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Crypto info footer */}
            <div className="text-center text-xs text-muted-foreground space-y-1">
              <p>Powered by bcrypt + node-forge (RSA-2048 / AES-256-CBC)</p>
            </div>
          </div>
        </main>
        <footer className="py-4 text-center text-xs text-muted-foreground border-t">
          SecureChat — Cryptographic Messaging Application
        </footer>
      </div>
    );
  }

  // ── DASHBOARD ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-bold text-lg">SecureChat</span>
            <Badge variant="secondary" className="ml-2 gap-1">
              <Lock className="w-3 h-3" /> RSA-2048
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Logged in as <strong>{currentUser.username}</strong>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="w-4 h-4" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 space-y-6">
        {/* Compose Section */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="w-5 h-5" /> Compose Encrypted Message
            </CardTitle>
            <CardDescription>
              Your message will be encrypted with the receiver&apos;s RSA public key before storage
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSendMessage}>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Recipient</Label>
                  <Select value={selectedReceiver} onValueChange={setSelectedReceiver}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a user..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.length === 0 ? (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No other users registered yet
                        </div>
                      ) : (
                        users.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            <span className="flex items-center gap-2">
                              <Users className="w-3.5 h-3.5" /> {u.username}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {selectedUser && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Message will be encrypted with {selectedUser.username}&apos;s public key
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    placeholder="Type your secret message..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={2}
                    required
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0">
              <Button
                type="submit"
                className="gap-2"
                disabled={loading || !selectedReceiver || !messageText.trim()}
              >
                <Send className="w-4 h-4" />
                {loading ? "Encrypting & Sending..." : "Encrypt & Send"}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Messages Section */}
        <Tabs defaultValue="received" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="received" className="gap-2">
                <MessageSquare className="w-4 h-4" />
                Received ({receivedMessages.length})
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-2">
                <Send className="w-4 h-4" />
                Sent ({sentMessages.length})
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { if (currentUser) loadDashboard(currentUser.id); }}
              className="gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
          </div>

          {/* RECEIVED MESSAGES */}
          <TabsContent value="received">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-600" />
                  Decrypted Inbox
                </CardTitle>
                <CardDescription>
                  Messages are decrypted on-the-fly using your private key. Toggle the lock icon to view ciphertext.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receivedMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No messages yet</p>
                    <p className="text-sm">Ask someone to send you an encrypted message!</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {receivedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                                {msg.sender.username[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="font-medium text-sm">
                                  {msg.sender.username}
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                  {formatTime(msg.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                {msg.encryptionType}
                              </Badge>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => toggleCiphertext(msg.id)}
                                  >
                                    {showCiphertext[msg.id] ? (
                                      <EyeOff className="w-3.5 h-3.5" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                    {showCiphertext[msg.id] ? "Hide" : "View"} Ciphertext
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <Lock className="w-5 h-5" />
                                      Encrypted Ciphertext
                                    </DialogTitle>
                                    <DialogDescription>
                                      This is the RSA-OAEP + AES-256-CBC encrypted data stored in the database.
                                      Only your private key can decrypt it.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="rounded-lg bg-muted p-4 overflow-auto max-h-64">
                                    <pre className="text-xs break-all whitespace-pre-wrap font-mono">
                                      {msg.ciphertext}
                                    </pre>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                          <div className="pl-10">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                              <p className="text-sm leading-relaxed">
                                {msg.plaintext || "[Decryption failed]"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* SENT MESSAGES */}
          <TabsContent value="sent">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="w-5 h-5" />
                  Sent Messages
                </CardTitle>
                <CardDescription>
                  Messages you sent are stored encrypted. Only the recipient can decrypt them.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {sentMessages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Send className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No sent messages</p>
                    <p className="text-sm">Compose a message above to get started!</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-3">
                      {sentMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="rounded-lg border p-4 space-y-2 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                {msg.receiver.username[0].toUpperCase()}
                              </div>
                              <div>
                                <span className="text-muted-foreground text-xs">To: </span>
                                <span className="font-medium text-sm">
                                  {msg.receiver.username}
                                </span>
                                <span className="text-muted-foreground text-xs ml-2">
                                  {formatTime(msg.createdAt)}
                                </span>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs gap-1">
                              <Lock className="w-3 h-3" />
                              Encrypted
                            </Badge>
                          </div>
                          <div className="pl-10">
                            <div className="rounded-lg bg-muted/50 p-3">
                              <p className="text-xs text-muted-foreground mb-1 font-medium">
                                Ciphertext (only {msg.receiver.username} can decrypt):
                              </p>
                              <p className="text-xs font-mono break-all line-clamp-3">
                                {msg.ciphertext.substring(0, 200)}...
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Crypto Education Panel */}
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              How It Works
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  Password Hashing
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Your password is hashed with <strong>bcrypt</strong> (salt rounds: 10) before storage.
                  The plaintext password is never stored — only the hash is saved.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  Key Generation
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  On registration, a <strong>RSA-2048</strong> key pair is generated using node-forge.
                  Your public key encrypts incoming messages; your private key decrypts them.
                </p>
              </div>
              <div className="space-y-1.5">
                <div className="font-semibold flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  Hybrid Encryption
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  Messages use <strong>RSA-OAEP + AES-256-CBC</strong>: a random AES key encrypts the
                  message, then RSA encrypts the AES key. Only the recipient&apos;s private key can
                  recover the AES key and decrypt the message.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="py-4 text-center text-xs text-muted-foreground border-t mt-auto">
        SecureChat — Cryptographic Messaging Application · bcrypt + node-forge (RSA-2048 / AES-256-CBC)
      </footer>
    </div>
  );
}
