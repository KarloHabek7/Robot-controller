import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, ArrowUpDown, Home } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Robot {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  image_url: string | null;
  number_of_axes: number | null;
  payload_kg: number | null;
  reach_mm: number | null;
  description: string | null;
}

export default function RobotCatalog() {
  const [robots, setRobots] = useState<Robot[]>([]);
  const [filteredRobots, setFilteredRobots] = useState<Robot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchRobots();
  }, []);

  useEffect(() => {
    filterAndSortRobots();
  }, [robots, searchQuery, manufacturerFilter, sortBy]);

  const fetchRobots = async () => {
    try {
      const { data, error } = await supabase
        .from('robots')
        .select('id, name, manufacturer, model, image_url, number_of_axes, payload_kg, reach_mm, description')
        .eq('is_active', true)
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

  const filterAndSortRobots = () => {
    let filtered = [...robots];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(robot =>
        robot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        robot.model?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Manufacturer filter
    if (manufacturerFilter !== 'all') {
      filtered = filtered.filter(robot => robot.manufacturer === manufacturerFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'payload':
          return (b.payload_kg || 0) - (a.payload_kg || 0);
        case 'reach':
          return (b.reach_mm || 0) - (a.reach_mm || 0);
        default:
          return 0;
      }
    });

    setFilteredRobots(filtered);
  };

  const manufacturers = Array.from(new Set(robots.map(r => r.manufacturer).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading robots...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-background border-b">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Industrial Robot Catalog</h1>
              <p className="text-lg text-muted-foreground">Educational Resources & Technical Specifications</p>
            </div>
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col md:flex-row gap-4 mt-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search robots by name, manufacturer, or model..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={manufacturerFilter} onValueChange={setManufacturerFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Manufacturer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Manufacturers</SelectItem>
                {manufacturers.map(manufacturer => (
                  <SelectItem key={manufacturer} value={manufacturer}>
                    {manufacturer}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-[200px]">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="payload">Payload (High to Low)</SelectItem>
                <SelectItem value="reach">Reach (High to Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Robot Grid */}
      <div className="container mx-auto px-4 py-8">
        {filteredRobots.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No robots found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredRobots.map(robot => (
              <Card
                key={robot.id}
                className="group cursor-pointer transition-all hover:shadow-lg hover:border-primary/50"
                onClick={() => navigate(`/catalog/${robot.id}`)}
              >
                <CardHeader className="p-0">
                  <div className="aspect-square bg-muted rounded-t-lg overflow-hidden">
                    {robot.image_url ? (
                      <img
                        src={robot.image_url}
                        alt={robot.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        No Image
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{robot.name}</CardTitle>
                      {robot.manufacturer && (
                        <CardDescription className="text-sm">
                          {robot.manufacturer} {robot.model && `• ${robot.model}`}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {robot.number_of_axes && (
                      <Badge variant="secondary" className="text-xs">
                        {robot.number_of_axes} Axes
                      </Badge>
                    )}
                    {robot.payload_kg && (
                      <Badge variant="secondary" className="text-xs">
                        {robot.payload_kg} kg
                      </Badge>
                    )}
                    {robot.reach_mm && (
                      <Badge variant="secondary" className="text-xs">
                        {robot.reach_mm} mm
                      </Badge>
                    )}
                  </div>
                  {robot.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
                      {robot.description}
                    </p>
                  )}
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
