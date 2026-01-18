import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface RobotDetail {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  image_url: string | null;
  datasheet_url: string | null;
  number_of_axes: number | null;
  reach_mm: number | null;
  repeatability_mm: number | null;
  payload_kg: number | null;
  arm_weight_kg: number | null;
  description: string | null;
  specifications: any;
}

interface RobotSpecifications {
  working_envelope_data: any;
  speed_data: any;
  mounting_options: string[] | null;
  protection_rating: string | null;
  power_consumption: number | null;
  operating_temperature_range: string | null;
}

interface RobotImage {
  id: string;
  image_url: string;
  image_type: string;
  caption: string | null;
  display_order: number;
}

export default function RobotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [robot, setRobot] = useState<RobotDetail | null>(null);
  const [specifications, setSpecifications] = useState<RobotSpecifications | null>(null);
  const [images, setImages] = useState<RobotImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchRobotDetails();
    }
  }, [id]);

  const fetchRobotDetails = async () => {
    try {
      // Fetch robot details
      const { data: robotData, error: robotError } = await supabase
        .from('robots')
        .select('*')
        .eq('id', id)
        .single();

      if (robotError) throw robotError;
      setRobot(robotData);
      setSelectedImage(robotData.image_url);

      // Fetch additional specifications
      const { data: specsData } = await supabase
        .from('robot_specifications')
        .select('*')
        .eq('robot_id', id)
        .maybeSingle();

      if (specsData) {
        setSpecifications(specsData);
      }

      // Fetch additional images
      const { data: imagesData } = await supabase
        .from('robot_images')
        .select('*')
        .eq('robot_id', id)
        .order('display_order');

      if (imagesData) {
        setImages(imagesData);
      }
    } catch (error) {
      console.error('Error fetching robot details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load robot details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading robot details...</p>
        </div>
      </div>
    );
  }

  if (!robot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground mb-4">Robot not found</p>
            <Button onClick={() => navigate('/catalog')}>Back to Catalog</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={() => navigate('/catalog')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Catalog
          </Button>
          {user && (
            <Button variant="default" onClick={() => navigate(`/robot/${robot.id}`)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Control Interface
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4">
                  {selectedImage ? (
                    <img
                      src={selectedImage}
                      alt={robot.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image Available
                    </div>
                  )}
                </div>
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {robot.image_url && (
                      <button
                        onClick={() => setSelectedImage(robot.image_url)}
                        className={`aspect-square rounded-md overflow-hidden border-2 ${
                          selectedImage === robot.image_url ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={robot.image_url} alt="Primary" className="w-full h-full object-cover" />
                      </button>
                    )}
                    {images.map(img => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImage(img.image_url)}
                        className={`aspect-square rounded-md overflow-hidden border-2 ${
                          selectedImage === img.image_url ? 'border-primary' : 'border-transparent'
                        }`}
                      >
                        <img src={img.image_url} alt={img.caption || ''} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{robot.name}</h1>
              {robot.manufacturer && (
                <p className="text-xl text-muted-foreground">
                  {robot.manufacturer} {robot.model && `• ${robot.model}`}
                </p>
              )}
              {robot.description && (
                <p className="text-muted-foreground mt-4">{robot.description}</p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Primary Specifications</CardTitle>
                <CardDescription>Core technical specifications required for homework</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-4">
                  <div className="border-b pb-2">
                    <dt className="text-sm text-muted-foreground">Number of Axes</dt>
                    <dd className="text-lg font-semibold">
                      {robot.number_of_axes || 'N/A'}
                    </dd>
                  </div>
                  <div className="border-b pb-2">
                    <dt className="text-sm text-muted-foreground">Reach</dt>
                    <dd className="text-lg font-semibold">
                      {robot.reach_mm ? `${robot.reach_mm} mm` : 'N/A'}
                    </dd>
                  </div>
                  <div className="border-b pb-2">
                    <dt className="text-sm text-muted-foreground">Repeatability</dt>
                    <dd className="text-lg font-semibold">
                      {robot.repeatability_mm ? `±${robot.repeatability_mm} mm` : 'N/A'}
                    </dd>
                  </div>
                  <div className="border-b pb-2">
                    <dt className="text-sm text-muted-foreground">Payload</dt>
                    <dd className="text-lg font-semibold">
                      {robot.payload_kg ? `${robot.payload_kg} kg` : 'N/A'}
                    </dd>
                  </div>
                  <div className="border-b pb-2 col-span-2">
                    <dt className="text-sm text-muted-foreground">Robot Arm Weight</dt>
                    <dd className="text-lg font-semibold">
                      {robot.arm_weight_kg ? `${robot.arm_weight_kg} kg` : 'N/A'}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {specifications && (
              <Card>
                <CardHeader>
                  <CardTitle>Additional Specifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="technical">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="technical">Technical</TabsTrigger>
                      <TabsTrigger value="environmental">Environmental</TabsTrigger>
                    </TabsList>
                    <TabsContent value="technical" className="space-y-4">
                      {specifications.mounting_options && specifications.mounting_options.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Mounting Options</h4>
                          <div className="flex flex-wrap gap-2">
                            {specifications.mounting_options.map(option => (
                              <Badge key={option} variant="outline">{option}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {specifications.power_consumption && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Power Consumption</h4>
                          <p className="text-sm text-muted-foreground">{specifications.power_consumption} kW</p>
                        </div>
                      )}
                    </TabsContent>
                    <TabsContent value="environmental" className="space-y-4">
                      {specifications.protection_rating && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Protection Rating</h4>
                          <p className="text-sm text-muted-foreground">{specifications.protection_rating}</p>
                        </div>
                      )}
                      {specifications.operating_temperature_range && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Operating Temperature</h4>
                          <p className="text-sm text-muted-foreground">{specifications.operating_temperature_range}</p>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {robot.datasheet_url && (
              <Button variant="outline" className="w-full" asChild>
                <a href={robot.datasheet_url} target="_blank" rel="noopener noreferrer">
                  <Download className="mr-2 h-4 w-4" />
                  Download Datasheet
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
