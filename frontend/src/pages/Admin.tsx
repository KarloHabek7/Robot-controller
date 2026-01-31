import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, ClipboardList, Trash2, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
    id: number;
    username: string;
    email: string;
    is_approved: boolean;
    is_superuser: boolean;
}

interface LogEntry {
    id: number;
    username: string;
    command: string;
    timestamp: string;
    success: boolean;
    details?: string;
}

const Admin = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const { user, signOut } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
        fetchLogs();
    }, []);

    const fetchUsers = async () => {
        try {
            // We need to implement this endpoint in api.ts as well
            // For now assuming we can fetch using a fetch call or adding to api service
            // Let's assume we will add getUsers to api service
            const response = await api.get<User[]>('/api/admin/users');
            setUsers(response);
        } catch (error: any) {
            console.error("Failed to fetch users", error);
            toast.error(error.message || t('admin.failedToFetch'));
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const response = await api.getActivityLogs();
            setLogs(response);
        } catch (error: any) {
            console.error("Failed to fetch logs", error);
            toast.error(t('admin.failedToFetchLogs') || "Failed to fetch activity logs");
        } finally {
            setLogsLoading(false);
        }
    };

    const handleClearLogs = async () => {
        if (!confirm(t('admin.confirmClearLogs') || "Are you sure you want to clear all logs?")) return;
        try {
            await api.clearActivityLogs();
            toast.success(t('admin.logsCleared') || "Logs cleared successfully");
            fetchLogs();
        } catch (error) {
            toast.error(t('admin.failedToClearLogs') || "Failed to clear logs");
        }
    };

    const handleApprove = async (userId: number) => {
        try {
            await api.post(`/api/admin/users/${userId}/approve`, {});
            toast.success(t('admin.userApproved'));
            fetchUsers();
        } catch (error) {
            toast.error(t('admin.failedToApprove'));
        }
    };

    const handleRevoke = async (userId: number) => {
        try {
            await api.post(`/api/admin/users/${userId}/revoke`, {});
            toast.success(t('admin.userRevoked'));
            fetchUsers();
        } catch (error) {
            toast.error(t('admin.failedToRevoke'));
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm(t('admin.confirmDelete'))) return;
        try {
            await api.delete(`/api/admin/users/${userId}`);
            toast.success(t('admin.userDeleted'));
            fetchUsers();
        } catch (error) {
            toast.error(t('admin.failedToDelete'));
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1 container py-4 sm:py-8 mx-auto px-2 sm:px-4 md:px-0">
                <div className="flex items-center justify-between mb-4 sm:mb-8">
                    <h1 className="text-xl sm:text-3xl font-black uppercase tracking-widest text-foreground/80">{t('admin.dashboard')}</h1>
                </div>

                <Tabs defaultValue="users" className="space-y-4">
                    <TabsList className="bg-muted/50 p-1 border border-border/40">
                        <TabsTrigger value="users" className="gap-2 px-4">
                            <Users className="w-4 h-4" />
                            {t('admin.userManagement')}
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="gap-2 px-4">
                            <ClipboardList className="w-4 h-4" />
                            {t('admin.activityLogs') || "Activity Logs"}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="users" className="space-y-4">
                        <Card className="border-border/40 shadow-xl overflow-hidden">
                            <CardHeader className="p-4 sm:p-6 border-b bg-muted/20 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm sm:text-xl">{t('admin.userManagement')}</CardTitle>
                                <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2 h-8">
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    {t('common.refresh')}
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0 sm:p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="w-[50px]">ID</TableHead>
                                                <TableHead>{t('admin.username')}</TableHead>
                                                <TableHead className="hidden sm:table-cell">{t('admin.email')}</TableHead>
                                                <TableHead>{t('admin.status')}</TableHead>
                                                <TableHead className="hidden md:table-cell">{t('admin.role')}</TableHead>
                                                <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {users.map((u) => (
                                                <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                                                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-sm">{u.username}</span>
                                                            <span className="text-[10px] text-muted-foreground sm:hidden">{u.email}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="hidden sm:table-cell text-sm">{u.email}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={u.is_approved ? "default" : "secondary"} className="text-[10px] uppercase font-bold px-1.5 py-0">
                                                            {u.is_approved ? t('admin.approved') : t('admin.pending')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {u.is_superuser && <Badge variant="outline" className="text-[10px] uppercase font-bold">{t('admin.admin')}</Badge>}
                                                    </TableCell>
                                                    <TableCell className="text-right whitespace-nowrap">
                                                        {!u.is_superuser && (
                                                            <div className="flex justify-end gap-1 sm:gap-2">
                                                                {!u.is_approved ? (
                                                                    <Button size="sm" onClick={() => handleApprove(u.id)} className="h-8 px-2 text-[10px] sm:text-xs">
                                                                        {t('admin.approve')}
                                                                    </Button>
                                                                ) : (
                                                                    <Button size="sm" variant="secondary" onClick={() => handleRevoke(u.id)} className="h-8 px-2 text-[10px] sm:text-xs">
                                                                        {t('admin.revoke')}
                                                                    </Button>
                                                                )}
                                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)} className="h-8 px-2 text-[10px] sm:text-xs">
                                                                    {t('admin.delete')}
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="logs" className="space-y-4">
                        <Card className="border-border/40 shadow-xl overflow-hidden">
                            <CardHeader className="p-4 sm:p-6 border-b bg-muted/20 flex flex-row items-center justify-between">
                                <CardTitle className="text-sm sm:text-xl">{t('admin.activityLogs') || "Activity Logs"}</CardTitle>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={logsLoading} className="gap-2 h-8">
                                        <RefreshCw className={cn("w-3.5 h-3.5", logsLoading && "animate-spin")} />
                                        {t('common.refresh')}
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={handleClearLogs} className="gap-2 h-8">
                                        <Trash2 className="w-3.5 h-3.5" />
                                        {t('logs.clear')}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/30">
                                                <TableHead className="w-[180px]">{t('logs.timestamp')}</TableHead>
                                                <TableHead className="w-[120px]">{t('admin.username')}</TableHead>
                                                <TableHead>{t('logs.command')}</TableHead>
                                                <TableHead className="w-[100px] text-center">{t('logs.status')}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {logs.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                                                        {t('commands.noCommands')}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                logs.map((log) => (
                                                    <TableRow key={log.id} className="hover:bg-muted/10 transition-colors">
                                                        <TableCell className="text-xs font-mono text-muted-foreground">
                                                            {new Date(log.timestamp).toLocaleString()}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-sm">
                                                            {log.username}
                                                        </TableCell>
                                                        <TableCell>
                                                            <code className="text-[11px] bg-secondary/30 px-1.5 py-0.5 rounded font-mono text-primary">
                                                                {log.command}
                                                            </code>
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            {log.success ? (
                                                                <div className="flex justify-center">
                                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                </div>
                                                            ) : (
                                                                <div className="flex justify-center">
                                                                    <XCircle className="w-4 h-4 text-destructive" />
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Admin;
