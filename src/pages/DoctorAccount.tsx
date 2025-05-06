import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PageLayout from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface DoctorProfile {
  id?: string;
  user_id: string;
  full_name: string;
  specialization: string;
  bio: string;
  contact_email: string;
  phone_number: string;
  notification_preferences: {
    email: boolean;
    sms: boolean;
    app: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

const defaultProfile: DoctorProfile = {
  user_id: '',
  full_name: '',
  specialization: '',
  bio: '',
  contact_email: '',
  phone_number: '',
  notification_preferences: {
    email: true,
    sms: false,
    app: true,
  },
};

const DoctorAccount = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [profile, setProfile] = useState<DoctorProfile>(defaultProfile);
  const queryClient = useQueryClient();

  // Fetch doctor profile
  const { data: doctorProfile, isLoading } = useQuery({
    queryKey: ['doctor-profile'],
    queryFn: async () => {
      if (!user) throw new Error('No user logged in');
      
      try {
        const response = await apiClient.get(`/doctor-profile/${user.id}`);
        return response.data as DoctorProfile;
      } catch (error: any) {
        // If profile doesn't exist yet, return null
        if (error.response && error.response.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });

  // Update doctor profile
  const updateProfile = useMutation({
    mutationFn: async (updatedProfile: DoctorProfile) => {
      if (!user) throw new Error('No user logged in');

      // If profile exists, update it
      if (updatedProfile.id) {
        const response = await apiClient.put(`/doctor-profile/${updatedProfile.id}`, updatedProfile);
        return response.data;
      } 
      // Otherwise create a new profile
      else {
        const newProfile = {
          ...updatedProfile,
          user_id: user.id
        };

        const response = await apiClient.post('/doctor-profile', newProfile);
        return response.data;
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['doctor-profile'], data);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  useEffect(() => {
    if (doctorProfile) {
      setProfile(doctorProfile);
    } else if (user && !isLoading) {
      // Initialize with default values and current user info
      setProfile({
        ...defaultProfile,
        user_id: user.id,
        full_name: user.full_name || '',
        contact_email: user.email || '',
      });
    }
  }, [doctorProfile, user, isLoading]);

  const handleProfileUpdate = async () => {
    updateProfile.mutate(profile);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (key: 'email' | 'sms' | 'app') => {
    setProfile((prev) => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [key]: !prev.notification_preferences[key],
      },
    }));
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-medical-slate">Account Settings</h1>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your profile information visible to patients and colleagues
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        value={profile.full_name}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        name="specialization"
                        placeholder="E.g., Cardiology, Family Medicine"
                        value={profile.specialization}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      placeholder="Tell patients about your qualifications and experience"
                      value={profile.bio}
                      onChange={handleInputChange}
                      className="min-h-32"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_email">Contact Email</Label>
                      <Input
                        id="contact_email"
                        name="contact_email"
                        value={profile.contact_email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone_number">Phone Number</Label>
                      <Input
                        id="phone_number"
                        name="phone_number"
                        placeholder="+1 (123) 456-7890"
                        value={profile.phone_number}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                  <Button variant="outline">Cancel</Button>
                  <Button 
                    onClick={handleProfileUpdate}
                    disabled={updateProfile.isPending}
                  >
                    {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Security Settings</CardTitle>
                  <CardDescription>
                    Manage your password and account security preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current_password">Current Password</Label>
                    <Input id="current_password" type="password" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new_password">New Password</Label>
                      <Input id="new_password" type="password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm_password">Confirm Password</Label>
                      <Input id="confirm_password" type="password" />
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
                    Manage how you receive notifications and alerts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">Email Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch 
                      checked={profile.notification_preferences.email}
                      onCheckedChange={() => handleNotificationToggle('email')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">SMS Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive notifications via text message
                      </p>
                    </div>
                    <Switch 
                      checked={profile.notification_preferences.sms}
                      onCheckedChange={() => handleNotificationToggle('sms')}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">App Notifications</h4>
                      <p className="text-sm text-muted-foreground">
                        Receive push notifications in the app
                      </p>
                    </div>
                    <Switch 
                      checked={profile.notification_preferences.app}
                      onCheckedChange={() => handleNotificationToggle('app')}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleProfileUpdate}>Save Preferences</Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
};

export default DoctorAccount;
