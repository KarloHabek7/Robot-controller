import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ArrowLeft, UserPlus, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import RobotManagement from '@/components/RobotManagement';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: string | null;
}

interface Robot {
  id: string;
  name: string;
}

interface RobotAccess {
  id: string;
  robot_id: string;
  user_id: string;
  robot_name: string;
  user_email: string;
}

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isProfessor, loading: roleLoading } = useUserRole(user?.id);
  const [users, setUsers] = useState<User[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [robotAccess, setRobotAccess] = useState<RobotAccess[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isProfessor) {
      toast.error('Access denied. Professors only.');
      navigate('/');
      return;
    }

    if (isProfessor) {
      fetchData();
    }
  }, [isProfessor, roleLoading, navigate]);

  const fetchData = async () => {
    try {
      // Fetch all users with their profiles and roles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select(`
          user_id,
          full_name,
          display_name
        `);

      if (profilesError) throw profilesError;

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles' as any)
        .select('user_id, role')
        .returns<{ user_id: string; role: string }[]>();

      if (rolesError) throw rolesError;

      // Fetch auth users
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Combine the data
      const usersWithRoles = profilesData?.map((profile: any) => {
        const authUser = authData.users.find((u: any) => u.id === profile.user_id);
        const userRole = rolesData?.find((r: any) => r.user_id === profile.user_id);
        
        return {
          id: profile.user_id,
          email: authUser?.email || '',
          full_name: profile.full_name,
          display_name: profile.display_name,
          role: userRole?.role || null,
        };
      }) || [];

      setUsers(usersWithRoles);

      // Fetch robots
      const { data: robotsData, error: robotsError } = await supabase
        .from('robots')
        .select('id, name');

      if (robotsError) throw robotsError;
      setRobots(robotsData || []);

      // Fetch robot access
      const { data: accessData, error: accessError } = await supabase
        .from('robot_access' as any)
        .select(`
          id,
          robot_id,
          user_id
        `);

      if (accessError) throw accessError;

      const accessWithNames = accessData?.map((access: any) => {
        const robot = robotsData?.find(r => r.id === access.robot_id);
        const user = usersWithRoles.find(u => u.id === access.user_id);
        
        return {
          ...access,
          robot_name: robot?.name || 'Unknown',
          user_email: user?.email || 'Unknown',
        };
      }) || [];

      setRobotAccess(accessWithNames);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'professor' | 'student') => {
    try {
      const existingRole = users.find(u => u.id === userId)?.role;

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles' as any)
          .update({ role: newRole })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles' as any)
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast.success('Role updated successfully');
      fetchData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const handleGrantAccess = async (robotId: string, userId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('robot_access' as any)
        .insert({
          robot_id: robotId,
          user_id: userId,
          granted_by: user.id,
        });

      if (error) {
        if (error.message?.includes('duplicate')) {
          toast.error('Access already granted');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Access granted successfully');
      fetchData();
    } catch (error) {
      console.error('Error granting access:', error);
      toast.error('Failed to grant access');
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await supabase
        .from('robot_access' as any)
        .delete()
        .eq('id', accessId);

      if (error) throw error;

      toast.success('Access revoked successfully');
      fetchData();
    } catch (error) {
      console.error('Error revoking access:', error);
      toast.error('Failed to revoke access');
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Admin Panel
          </h1>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="robots">Robot Management</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Roles Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    User Roles
                  </CardTitle>
                  <CardDescription>
                    Assign roles to users (Professor or Student)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {users.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{u.display_name || u.full_name || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{u.email}</div>
                        </div>
                        <Select
                          value={u.role || 'none'}
                          onValueChange={(value) => {
                            if (value !== 'none') {
                              handleRoleChange(u.id, value as 'professor' | 'student');
                            }
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Role</SelectItem>
                            <SelectItem value="professor">Professor</SelectItem>
                            <SelectItem value="student">Student</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Robot Access Management */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Robot Access
                  </CardTitle>
                  <CardDescription>
                    Grant students access to specific robots
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Grant Access Form */}
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-3">Grant New Access</h4>
                      <div className="space-y-2">
                        <Select onValueChange={(robotId) => {
                          const selectedUserId = users.find(u => u.role === 'student')?.id;
                          if (selectedUserId && robotId) {
                            handleGrantAccess(robotId, selectedUserId);
                          }
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Robot & Student" />
                          </SelectTrigger>
                          <SelectContent>
                            {robots.map((robot) => (
                              <SelectItem key={robot.id} value={robot.id}>
                                {robot.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Current Access List */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Current Access</h4>
                      {robotAccess.map((access) => (
                        <div key={access.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <div className="font-medium">{access.robot_name}</div>
                            <div className="text-sm text-muted-foreground">{access.user_email}</div>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRevokeAccess(access.id)}
                          >
                            Revoke
                          </Button>
                        </div>
                      ))}
                      {robotAccess.length === 0 && (
                        <div className="text-center text-muted-foreground py-4">
                          No robot access granted yet
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="robots">
            <RobotManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
