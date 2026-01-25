import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
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
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // We need to implement this endpoint in api.ts as well
            // For now assuming we can fetch using a fetch call or adding to api service
            // Let's assume we will add getUsers to api service
            const response = await api.get<User[]>('/admin/users');
            setUsers(response);
        } catch (error) {
            console.error("Failed to fetch users", error);
            toast({
                title: "Error",
                description: "Failed to fetch users",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (userId: number) => {
        try {
            await api.post(`/admin/users/${userId}/approve`, {});
            toast({ title: "Success", description: "User approved" });
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Failed to approve user", variant: "destructive" });
        }
    };

    const handleRevoke = async (userId: number) => {
        try {
            await api.post(`/admin/users/${userId}/revoke`, {});
            toast({ title: "Success", description: "User access revoked" });
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Failed to revoke user", variant: "destructive" });
        }
    };

    const handleDelete = async (userId: number) => {
        if (!confirm("Are you sure you want to delete this user?")) return;
        try {
            await api.delete(`/admin/users/${userId}`);
            toast({ title: "Success", description: "User deleted" });
            fetchUsers();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="container py-8 mx-auto">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <div className="space-x-4">
                    <Button variant="outline" onClick={() => navigate("/")}>Robot Control</Button>
                    <Button variant="destructive" onClick={signOut}>Sign Out</Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
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
                                            {u.is_approved ? "Approved" : "Pending"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {u.is_superuser && <Badge variant="outline">Admin</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        {!u.is_superuser && (
                                            <>
                                                {!u.is_approved ? (
                                                    <Button size="sm" onClick={() => handleApprove(u.id)}>
                                                        Approve
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="secondary" onClick={() => handleRevoke(u.id)}>
                                                        Revoke
                                                    </Button>
                                                )}
                                                <Button size="sm" variant="destructive" onClick={() => handleDelete(u.id)}>
                                                    Delete
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
    );
};

export default Admin;
