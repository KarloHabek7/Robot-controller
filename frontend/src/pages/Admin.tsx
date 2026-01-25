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
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";

interface User {
    id: number;
    username: string;
    email: string;
    is_approved: boolean;
    is_superuser: boolean;
}

const Admin = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user, signOut } = useAuth();
    const { t } = useTranslation();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // We need to implement this endpoint in api.ts as well
            // For now assuming we can fetch using a fetch call or adding to api service
            // Let's assume we will add getUsers to api service
            const response = await api.get<User[]>('/api/admin/users');
            setUsers(response);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast({
                title: t('common.error'),
                description: t('admin.failedToFetch'),
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: number) => {
        try {
            await api.post(`/api/admin/users/${userId}/approve`, {});
            toast({ title: t('common.success'), description: t('admin.userApproved') });
            fetchUsers();
        } catch (error) {
            toast({ title: t('common.error'), description: t('admin.failedToApprove'), variant: "destructive" });
        }
    };

    const handleRevoke = async (userId: number) => {
        try {
            await api.post(`/api/admin/users/${userId}/revoke`, {});
            toast({ title: t('common.success'), description: t('admin.userRevoked') });
            fetchUsers();
        } catch (error) {
            toast({ title: t('common.error'), description: t('admin.failedToRevoke'), variant: "destructive" });
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm(t('admin.confirmDelete'))) return;
        try {
            await api.delete(`/api/admin/users/${userId}`);
            toast({ title: t('common.success'), description: t('admin.userDeleted') });
            fetchUsers();
        } catch (error) {
            toast({ title: t('common.error'), description: t('admin.failedToDelete'), variant: "destructive" });
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-screen">{t('common.loading')}</div>;

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <div className="flex-1 container py-8 mx-auto px-4 md:px-0">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-black uppercase tracking-widest text-foreground/80">{t('admin.dashboard')}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('admin.userManagement')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>{t('admin.username')}</TableHead>
                                    <TableHead>{t('admin.email')}</TableHead>
                                    <TableHead>{t('admin.status')}</TableHead>
                                    <TableHead>{t('admin.role')}</TableHead>
                                    <TableHead className="text-right">{t('admin.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((u) => (
                                    <TableRow key={u.id}>
                                        <TableCell>{u.id}</TableCell>
                                        <TableCell>{u.username}</TableCell>
                                        <TableCell>{u.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={u.is_approved ? "default" : "secondary"}>
                                                {u.is_approved ? t('admin.approved') : t('admin.pending')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {u.is_superuser && <Badge variant="outline">{t('admin.admin')}</Badge>}
                                        </TableCell>
                                        <TableCell className="text-right space-x-2">
                                            {!u.is_superuser && (
                                                <>
                                                    {!u.is_approved ? (
                                                        <Button size="sm" onClick={() => handleApprove(u.id)}>
                                                            {t('admin.approve')}
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="secondary" onClick={() => handleRevoke(u.id)}>
                                                            {t('admin.revoke')}
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)}>
                                                        {t('admin.delete')}
                                                    </Button>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Admin;
