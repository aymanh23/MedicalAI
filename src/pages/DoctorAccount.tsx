
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import PageLayout from '@/components/layout/PageLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

interface DoctorProfile {
  id: string;
  full_name?: string;
  specialty?: string;
  hospital?: string;
  years_experience?: number;
  biography?: string;
  email?: string;
}

const DoctorAccount = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profileData, setProfileData] = useState<DoctorProfile>({
    id: user?.id || '',
    full_name: '',
    specialty: '',
    hospital: '',
    years_experience: 0,
    biography: '',
    email: user?.email || '',
  });

  // Fetch doctor profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ['doctor-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('doctor_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      return data as DoctorProfile | null;
    },
    enabled: !!user?.id,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updatedProfile: DoctorProfile) => {
      const { data, error } = await supabase
        .from('doctor_profiles')
        .upsert(updatedProfile, { onConflict: 'id' })
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: `Failed to update profile: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (profile) {
      setProfileData({
        ...profileData,
        ...profile,
      });
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const getInitials = () => {
    if (profileData.full_name) {
      return profileData.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    return user?.email?.substring(0, 2).toUpperCase() || 'DR';
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-medical-slate mb-6">Doctor Account</h1>

        <Tabs defaultValue="profile" className="max-w-3xl mx-auto">
          <TabsList className="mb-6">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Doctor Profile</CardTitle>
                <CardDescription>
                  Update your profile information visible to patients and hospital staff.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 mb-8">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src="" alt={profileData.full_name} />
                        <AvatarFallback className="text-2xl bg-medical-blue text-white">
                          {getInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-xl font-medium">{profileData.full_name || 'Doctor'}</h3>
                        <p className="text-muted-foreground">{profileData.email}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {profileData.specialty} {profileData.hospital ? `at ${profileData.hospital}` : ''}
                        </p>
                        <Button variant="outline" size="sm" className="mt-3">
                          Change Avatar
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="full_name" className="text-sm font-medium">Full Name</label>
                        <Input
                          id="full_name"
                          name="full_name"
                          value={profileData.full_name || ''}
                          onChange={handleInputChange}
                          placeholder="Dr. Jane Smith"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">Email</label>
                        <Input
                          id="email"
                          name="email"
                          value={profileData.email || ''}
                          onChange={handleInputChange}
                          disabled
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="specialty" className="text-sm font-medium">Specialty</label>
                        <Input
                          id="specialty"
                          name="specialty"
                          value={profileData.specialty || ''}
                          onChange={handleInputChange}
                          placeholder="Cardiology"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="hospital" className="text-sm font-medium">Hospital/Clinic</label>
                        <Input
                          id="hospital"
                          name="hospital"
                          value={profileData.hospital || ''}
                          onChange={handleInputChange}
                          placeholder="City General Hospital"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="years_experience" className="text-sm font-medium">Years of Experience</label>
                        <Input
                          id="years_experience"
                          name="years_experience"
                          type="number"
                          value={profileData.years_experience || ''}
                          onChange={handleInputChange}
                          placeholder="10"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="biography" className="text-sm font-medium">Professional Biography</label>
                      <textarea 
                        id="biography"
                        name="biography"
                        value={profileData.biography || ''}
                        onChange={handleInputChange}
                        placeholder="Share your professional background, specializations, and approach to medicine."
                        className="w-full min-h-[120px] px-3 py-2 border border-input rounded-md"
                      />
                    </div>
                  </form>
                )}
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button 
                  type="submit" 
                  onClick={handleSubmit} 
                  disabled={updateProfileMutation.isPending}
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="current_password" className="text-sm font-medium">Current Password</label>
                    <Input 
                      id="current_password" 
                      type="password" 
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="new_password" className="text-sm font-medium">New Password</label>
                    <Input 
                      id="new_password" 
                      type="password" 
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm_password" className="text-sm font-medium">Confirm New Password</label>
                    <Input 
                      id="confirm_password" 
                      type="password" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>Update Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Configure how you want to receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">New Patient Cases</h4>
                      <p className="text-sm text-muted-foreground">Get notified when new patient cases are assigned to you</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Email</Button>
                      <Button variant="outline" size="sm">SMS</Button>
                      <Button variant="secondary" size="sm">In-App</Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">Case Updates</h4>
                      <p className="text-sm text-muted-foreground">Receive updates when your patient cases have new information</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">Email</Button>
                      <Button variant="outline" size="sm">SMS</Button>
                      <Button variant="secondary" size="sm">In-App</Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium">System Notifications</h4>
                      <p className="text-sm text-muted-foreground">Receive important system updates and announcements</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="secondary" size="sm">Email</Button>
                      <Button variant="outline" size="sm">SMS</Button>
                      <Button variant="secondary" size="sm">In-App</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button>Save Preferences</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
};

export default DoctorAccount;
