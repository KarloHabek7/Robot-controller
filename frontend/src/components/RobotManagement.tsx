import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2 } from 'lucide-react';

interface Robot {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  number_of_axes: number | null;
  reach_mm: number | null;
  repeatability_mm: number | null;
  payload_kg: number | null;
  arm_weight_kg: number | null;
  is_active: boolean;
}

export default function RobotManagement() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRobot, setEditingRobot] = useState<Robot | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    manufacturer: '',
    model: '',
    description: '',
    image_url: '',
    datasheet_url: '',
    number_of_axes: '',
    reach_mm: '',
    repeatability_mm: '',
    payload_kg: '',
    arm_weight_kg: '',
  });

  useEffect(() => {
    fetchRobots();
  }, []);

  const fetchRobots = async () => {
    try {
      const { data, error } = await supabase
        .from('robots')
        .select('id, name, manufacturer, model, number_of_axes, reach_mm, repeatability_mm, payload_kg, arm_weight_kg, is_active')
        .order('name');

      if (error) throw error;
      setRobots(data || []);
    } catch (error) {
      console.error('Error fetching robots:', error);
      toast({
        title: 'Error',
        description: 'Failed to load robots',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const robotData = {
      name: formData.name,
      manufacturer: formData.manufacturer || null,
      model: formData.model || null,
      description: formData.description || null,
      image_url: formData.image_url || null,
      datasheet_url: formData.datasheet_url || null,
      number_of_axes: formData.number_of_axes ? parseInt(formData.number_of_axes) : null,
      reach_mm: formData.reach_mm ? parseFloat(formData.reach_mm) : null,
      repeatability_mm: formData.repeatability_mm ? parseFloat(formData.repeatability_mm) : null,
      payload_kg: formData.payload_kg ? parseFloat(formData.payload_kg) : null,
      arm_weight_kg: formData.arm_weight_kg ? parseFloat(formData.arm_weight_kg) : null,
      is_active: true,
    };

    try {
      if (editingRobot) {
        const { error } = await supabase
          .from('robots')
          .update(robotData)
          .eq('id', editingRobot.id);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Robot updated successfully',
        });
      } else {
        const { error } = await supabase
          .from('robots')
          .insert([robotData]);

        if (error) throw error;
        toast({
          title: 'Success',
          description: 'Robot added successfully',
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchRobots();
    } catch (error) {
      console.error('Error saving robot:', error);
      toast({
        title: 'Error',
        description: 'Failed to save robot',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (robot: Robot) => {
    setEditingRobot(robot);
    setFormData({
      name: robot.name,
      manufacturer: robot.manufacturer || '',
      model: robot.model || '',
      description: '',
      image_url: '',
      datasheet_url: '',
      number_of_axes: robot.number_of_axes?.toString() || '',
      reach_mm: robot.reach_mm?.toString() || '',
      repeatability_mm: robot.repeatability_mm?.toString() || '',
      payload_kg: robot.payload_kg?.toString() || '',
      arm_weight_kg: robot.arm_weight_kg?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (robotId: string) => {
    if (!confirm('Are you sure you want to delete this robot?')) return;

    try {
      const { error } = await supabase
        .from('robots')
        .delete()
        .eq('id', robotId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Robot deleted successfully',
      });
      fetchRobots();
    } catch (error) {
      console.error('Error deleting robot:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete robot',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      manufacturer: '',
      model: '',
      description: '',
      image_url: '',
      datasheet_url: '',
      number_of_axes: '',
      reach_mm: '',
      repeatability_mm: '',
      payload_kg: '',
      arm_weight_kg: '',
    });
    setEditingRobot(null);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Robot Management</CardTitle>
            <CardDescription>Add and manage robots in the catalog</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Robot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingRobot ? 'Edit Robot' : 'Add New Robot'}</DialogTitle>
                <DialogDescription>
                  Enter the robot specifications. All measurements should be in the specified units.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="name">Robot Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="manufacturer">Manufacturer</Label>
                    <Input
                      id="manufacturer"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="model">Model</Label>
                    <Input
                      id="model"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="image_url">Image URL</Label>
                    <Input
                      id="image_url"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      placeholder="https://example.com/robot-image.jpg"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="datasheet_url">Datasheet URL</Label>
                    <Input
                      id="datasheet_url"
                      value={formData.datasheet_url}
                      onChange={(e) => setFormData({ ...formData, datasheet_url: e.target.value })}
                      placeholder="https://example.com/datasheet.pdf"
                    />
                  </div>
                  <div>
                    <Label htmlFor="number_of_axes">Number of Axes</Label>
                    <Input
                      id="number_of_axes"
                      type="number"
                      value={formData.number_of_axes}
                      onChange={(e) => setFormData({ ...formData, number_of_axes: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reach_mm">Reach (mm)</Label>
                    <Input
                      id="reach_mm"
                      type="number"
                      step="0.01"
                      value={formData.reach_mm}
                      onChange={(e) => setFormData({ ...formData, reach_mm: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="repeatability_mm">Repeatability (mm)</Label>
                    <Input
                      id="repeatability_mm"
                      type="number"
                      step="0.001"
                      value={formData.repeatability_mm}
                      onChange={(e) => setFormData({ ...formData, repeatability_mm: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payload_kg">Payload (kg)</Label>
                    <Input
                      id="payload_kg"
                      type="number"
                      step="0.1"
                      value={formData.payload_kg}
                      onChange={(e) => setFormData({ ...formData, payload_kg: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="arm_weight_kg">Robot Arm Weight (kg)</Label>
                    <Input
                      id="arm_weight_kg"
                      type="number"
                      step="0.1"
                      value={formData.arm_weight_kg}
                      onChange={(e) => setFormData({ ...formData, arm_weight_kg: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingRobot ? 'Update Robot' : 'Add Robot'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manufacturer</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Axes</TableHead>
              <TableHead>Payload</TableHead>
              <TableHead>Reach</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {robots.map((robot) => (
              <TableRow key={robot.id}>
                <TableCell className="font-medium">{robot.name}</TableCell>
                <TableCell>{robot.manufacturer || '-'}</TableCell>
                <TableCell>{robot.model || '-'}</TableCell>
                <TableCell>{robot.number_of_axes || '-'}</TableCell>
                <TableCell>{robot.payload_kg ? `${robot.payload_kg} kg` : '-'}</TableCell>
                <TableCell>{robot.reach_mm ? `${robot.reach_mm} mm` : '-'}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(robot)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(robot.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
