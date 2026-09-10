import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { compressImage, blobToDataUrl } from "@/lib/image-utils";
import { usePiNetwork } from '@/hooks/use-pi-network';
import { useLocation } from 'wouter';
import CountrySelector from '@/components/country-selector';
import { COUNTRIES, LANGUAGES, GAME_LOGOS } from '@/lib/constants';
import type { User } from '@/types/pi-network';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  completedTransactions?: number;
}

type ProfileFormData = {
  email: string;
  country: string;
  phone: string;
  language: string;
  gameAccounts: {
    pubg: { ign: string; uid: string };
    pubgkr: { ign: string; uid: string };
    mlbb: { userId: string; zoneId: string };
    coc: { email: string };
    robux: { email?: string; whatsapp?: string; username?: string };
    newstate: { email?: string; whatsapp?: string; characterId?: string };
    freefire: { playerId: string };
    tiktok: { username: string };
    youtube: { channelUrl: string };
    facebook: { profileUrl: string };
    instagram: { username: string };
    netflix: { email: string; whatsapp: string };
    canva: { email: string; whatsapp: string };
  };
  socialAccounts: {
    tiktok: { username?: string; email?: string; password?: string };
    youtube: { channelUrl?: string; link?: string; email?: string; password?: string };
    facebook: { profileUrl?: string; link?: string };
    instagram: { username?: string; link?: string };
    netflix: { email: string; whatsapp: string };
    canva: { email: string; whatsapp: string };
  };
  referralCode: string;
  gamesPlayed: Record<'pubg' | 'pubgkr' | 'mlbb' | 'coc' | 'robux' | 'newstate' | 'freefire' | 'tiktok' | 'youtube' | 'facebook' | 'instagram' | 'netflix' | 'canva', boolean>;
  profilePicture: string;
};

export default function ProfileModal({ isOpen, onClose, completedTransactions = 0 }: ProfileModalProps) {
  const { user, token, updateUser } = usePiNetwork();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    email: '',
    country: 'BT',
    phone: '',
    language: 'en',
    gameAccounts: {
      pubg: { ign: '', uid: '' },
      pubgkr: { ign: '', uid: '' },
      mlbb: { userId: '', zoneId: '' },
      coc: { email: '' },
      robux: { email: '', whatsapp: '' },
      newstate: { email: '', whatsapp: '' },
      freefire: { playerId: '' },
      tiktok: { username: '' },
      youtube: { channelUrl: '' },
      facebook: { profileUrl: '' },
      instagram: { username: '' },
      netflix: { email: '', whatsapp: '' },
      canva: { email: '', whatsapp: '' }
    },
    socialAccounts: {
      tiktok: { email: '', password: '' },
      youtube: { link: '', email: '', password: '' },
      facebook: { link: '' },
      instagram: { link: '' },
      netflix: { email: '', whatsapp: '' },
      canva: { email: '', whatsapp: '' }
    },
    referralCode: '',
    gamesPlayed: {
      pubg: false,
      pubgkr: false,
      mlbb: false,
      coc: false,
      robux: false,
      newstate: false,
      freefire: false,
      tiktok: false,
      youtube: false,
      facebook: false,
      instagram: false,
      netflix: false,
      canva: false
    },
    profilePicture: ''
  });

  const [profilePicturePreview, setProfilePicturePreview] = useState<string>('');
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      console.log('Initializing form data with user:', user);
      setFormData({
        email: user.email || '',
        country: user.country || 'BT',
        phone: user.phone || '',
        language: user.language || 'en',
        gameAccounts: {
          pubg: {
            ign: user.gameAccounts?.pubg?.ign || '',
            uid: user.gameAccounts?.pubg?.uid || ''
          },
          pubgkr: {
            ign: user.gameAccounts?.pubgkr?.ign || '',
            uid: user.gameAccounts?.pubgkr?.uid || ''
          },
          mlbb: {
            userId: user.gameAccounts?.mlbb?.userId || '',
            zoneId: user.gameAccounts?.mlbb?.zoneId || ''
          },
          coc: {
            email: user.gameAccounts?.coc?.email || ''
          },
          robux: {
            email: user.gameAccounts?.robux?.email || '',
            whatsapp: user.gameAccounts?.robux?.whatsapp || ''
          },
          newstate: {
            email: user.gameAccounts?.newstate?.email || '',
            whatsapp: user.gameAccounts?.newstate?.whatsapp || ''
          },
          freefire: {
            playerId: user.gameAccounts?.freefire?.playerId || ''
          },
          tiktok: {
            username: user.gameAccounts?.tiktok?.username || user.socialAccounts?.tiktok?.username || ''
          },
          youtube: {
            channelUrl: user.gameAccounts?.youtube?.channelUrl || user.socialAccounts?.youtube?.channelUrl || ''
          },
          facebook: {
            profileUrl: user.gameAccounts?.facebook?.profileUrl || user.socialAccounts?.facebook?.profileUrl || ''
          },
          instagram: {
            username: user.gameAccounts?.instagram?.username || user.socialAccounts?.instagram?.username || ''
          },
          netflix: {
            email: user.gameAccounts?.netflix?.email || user.socialAccounts?.netflix?.email || '',
            whatsapp: user.gameAccounts?.netflix?.whatsapp || user.socialAccounts?.netflix?.whatsapp || ''
          },
          canva: {
            email: user.gameAccounts?.canva?.email || user.socialAccounts?.canva?.email || '',
            whatsapp: user.gameAccounts?.canva?.whatsapp || user.socialAccounts?.canva?.whatsapp || ''
          }
        },
        socialAccounts: {
          tiktok: {
            username: user.socialAccounts?.tiktok?.username || '',
            email: user.socialAccounts?.tiktok?.email || '',
            password: user.socialAccounts?.tiktok?.password || ''
          },
          youtube: {
            channelUrl: user.socialAccounts?.youtube?.channelUrl || '',
            link: user.socialAccounts?.youtube?.link || '',
            email: user.socialAccounts?.youtube?.email || '',
            password: user.socialAccounts?.youtube?.password || ''
          },
          facebook: {
            profileUrl: user.socialAccounts?.facebook?.profileUrl || '',
            link: user.socialAccounts?.facebook?.link || ''
          },
          instagram: {
            username: user.socialAccounts?.instagram?.username || '',
            link: user.socialAccounts?.instagram?.link || ''
          },
          netflix: {
            email: user.socialAccounts?.netflix?.email || '',
            whatsapp: user.socialAccounts?.netflix?.whatsapp || ''
          },
          canva: {
            email: user.socialAccounts?.canva?.email || '',
            whatsapp: user.socialAccounts?.canva?.whatsapp || ''
          }
        },
        referralCode: user.referralCode || '',
        gamesPlayed: {
          pubg: !!(user.gameAccounts?.pubg?.ign || user.gameAccounts?.pubg?.uid),
          pubgkr: !!(user.gameAccounts?.pubgkr?.ign || user.gameAccounts?.pubgkr?.uid),
          mlbb: !!(user.gameAccounts?.mlbb?.userId || user.gameAccounts?.mlbb?.zoneId),
          coc: !!(user.gameAccounts?.coc?.email),
          robux: !!(user.gameAccounts?.robux?.email || user.gameAccounts?.robux?.whatsapp),
          newstate: !!(user.gameAccounts?.newstate?.email || user.gameAccounts?.newstate?.whatsapp),
          freefire: !!(user.gameAccounts?.freefire?.playerId),
          tiktok: !!(user.gameAccounts?.tiktok?.username || user.socialAccounts?.tiktok?.email || user.socialAccounts?.tiktok?.password),
          youtube: !!(user.gameAccounts?.youtube?.channelUrl || user.socialAccounts?.youtube?.link || user.socialAccounts?.youtube?.email),
          facebook: !!(user.gameAccounts?.facebook?.profileUrl || user.socialAccounts?.facebook?.link),
          instagram: !!(user.gameAccounts?.instagram?.username || user.socialAccounts?.instagram?.link),
          netflix: !!(user.socialAccounts?.netflix?.email || user.socialAccounts?.netflix?.whatsapp),
          canva: !!(user.socialAccounts?.canva?.email || user.socialAccounts?.canva?.whatsapp)
        },
        profilePicture: user.profilePicture || ''
      });
      
      // Set profile picture preview
      setProfilePicturePreview(user.profilePicture || '');
    }
  }, [user?.id, isOpen]); // Use user?.id instead of user to prevent unnecessary re-renders

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('PUT', '/api/profile', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }
      return response.json();
    },
    onSuccess: (updatedUser) => {
      // Update user data in context
      updateUser(updatedUser);
      
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      console.error('Profile update error:', error);
      let errorMessage = error.message || "Failed to update profile";
      
      // Handle specific error messages
      if (errorMessage.includes('too large')) {
        errorMessage = "Your profile picture is too large. Please select a smaller image (under 1MB) or compress your current image.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate and compress file
      compressAndProcessImage(file);
    }
  };

  const compressAndProcessImage = async (file: File) => {
    try {
      // Show processing message
      const processingToast = toast({
        title: "Processing",
        description: "Compressing image...",
      });

      // Compress the image
      const compressedBlob = await compressImage(file, 0.7, 800);
      
      // Convert to data URL
      const imageData = await blobToDataUrl(compressedBlob);
      
      // Validate final size
      if (imageData.length > 1024 * 1024) {
        toast({
          title: "Error",
          description: "Compressed image is still too large. Please select a smaller image.",
          variant: "destructive",
        });
        return;
      }
      
      // Update preview and form data
      setProfilePicturePreview(imageData);
      setFormData(prev => ({
        ...prev,
        profilePicture: imageData
      }));
      
      toast({
        title: "Success",
        description: "Image compressed and ready for upload.",
      });
    } catch (error) {
      console.error('Image compression error:', error);
      toast({
        title: "Error",
        description: "Failed to process image. Please try another image.",
        variant: "destructive",
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeProfilePicture = () => {
    setProfilePicturePreview('');
    setFormData(prev => ({
      ...prev,
      profilePicture: ''
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate email
    if (formData.email && !formData.email.endsWith('@gmail.com')) {
      toast({
        title: "Error",
        description: "Email must be a Gmail address",
        variant: "destructive",
      });
      return;
    }

    // Validate required fields
    if (!formData.email || !formData.phone) {
      toast({
        title: "Error",
        description: "Email and phone number are required",
        variant: "destructive",
      });
      return;
    }

    // Validate game account IDs are numeric
    if (formData.gamesPlayed.pubg) {
      if (formData.gameAccounts.pubg.uid && !/^\d+$/.test(formData.gameAccounts.pubg.uid)) {
        toast({
          title: "Error",
          description: "PUBG Player UID must be numeric",
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.gamesPlayed.pubgkr) {
      if (formData.gameAccounts.pubgkr.uid && !/^\d+$/.test(formData.gameAccounts.pubgkr.uid)) {
        toast({
          title: "Error",
          description: "PUBG Mobile KR Player UID must be numeric",
          variant: "destructive",
        });
        return;
      }
    }

    if (formData.gamesPlayed.mlbb) {
      if (formData.gameAccounts.mlbb.userId && !/^\d+$/.test(formData.gameAccounts.mlbb.userId)) {
        toast({
          title: "Error",
          description: "Mobile Legends User ID must be numeric",
          variant: "destructive",
        });
        return;
      }
      
      if (formData.gameAccounts.mlbb.zoneId && !/^\d+$/.test(formData.gameAccounts.mlbb.zoneId)) {
        toast({
          title: "Error",
          description: "Mobile Legends Zone ID must be numeric",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate COC email if game is selected
    if (formData.gamesPlayed.coc) {
      if (formData.gameAccounts.coc.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.gameAccounts.coc.email)) {
        toast({
          title: "Error",
          description: "Please enter a valid email address for Clash of Clans",
          variant: "destructive",
        });
        return;
      }
    }

    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    // For phone field, only allow numbers and + for country code
    if (field === 'phone') {
      // Allow numbers and + for country code, but restrict to numeric after +
      value = value.replace(/[^0-9+]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGameAccountChange = (game: 'pubg' | 'pubgkr' | 'mlbb' | 'coc' | 'robux' | 'newstate' | 'freefire' | 'tiktok' | 'youtube' | 'facebook' | 'instagram' | 'netflix' | 'canva', field: string, value: string) => {
    // For UID, userId, zoneId, characterId, playerId - only allow numeric values
    if (field === 'uid' || field === 'userId' || field === 'zoneId' || field === 'characterId' || field === 'playerId') {
      // Allow only digits
      value = value.replace(/\D/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      gameAccounts: {
        ...prev.gameAccounts,
        [game]: {
          ...prev.gameAccounts[game],
          [field]: value
        }
      }
    }));
  };

  const handleSocialAccountChange = (platform: 'tiktok' | 'youtube' | 'facebook' | 'instagram' | 'netflix' | 'canva', field: string, value: string) => {
    // For whatsapp field, only allow numbers and +
    if (field === 'whatsapp') {
      value = value.replace(/[^0-9+]/g, '');
    }
    
    setFormData(prev => ({
      ...prev,
      socialAccounts: {
        ...prev.socialAccounts,
        [platform]: {
          ...prev.socialAccounts[platform],
          [field]: value
        }
      }
    }));
  };

  const handleGameSelectionChange = (game: 'pubg' | 'pubgkr' | 'mlbb' | 'coc' | 'robux' | 'newstate' | 'freefire' | 'tiktok' | 'youtube' | 'facebook' | 'instagram' | 'netflix' | 'canva', checked: boolean) => {
    console.log(`Game selection changed: ${game} = ${checked}`);
    setFormData(prev => {
      const updatedData = {
        ...prev,
        gamesPlayed: {
          ...prev.gamesPlayed,
          [game]: checked
        }
      };
      
      // If game is unchecked, clear the game account data for that game
      if (!checked) {
        if (game === 'pubg') {
          updatedData.gameAccounts.pubg = { ign: '', uid: '' };
        } else if (game === 'pubgkr') {
          updatedData.gameAccounts.pubgkr = { ign: '', uid: '' };
        } else if (game === 'mlbb') {
          updatedData.gameAccounts.mlbb = { userId: '', zoneId: '' };
        } else if (game === 'coc') {
          updatedData.gameAccounts.coc = { email: '' };
        } else if (game === 'robux') {
          updatedData.gameAccounts.robux = { username: '' };
        } else if (game === 'newstate') {
          updatedData.gameAccounts.newstate = { characterId: '' };
        } else if (game === 'freefire') {
          updatedData.gameAccounts.freefire = { playerId: '' };
        } else if (game === 'tiktok') {
          updatedData.gameAccounts.tiktok = { username: '' };
        } else if (game === 'youtube') {
          updatedData.gameAccounts.youtube = { channelUrl: '' };
        } else if (game === 'facebook') {
          updatedData.gameAccounts.facebook = { profileUrl: '' };
        } else if (game === 'instagram') {
          updatedData.gameAccounts.instagram = { username: '' };
        }
      }
      
      console.log('Updated form data:', updatedData);
      return updatedData;
    });
  };

  const handleCountrySelect = (countryCode: string) => {
    const selectedCountry = COUNTRIES.find(c => c.code === countryCode);
    if (selectedCountry) {
      // Update country
      handleInputChange('country', countryCode);
      
      // If phone field is empty, populate with country code
      if (!formData.phone) {
        handleInputChange('phone', selectedCountry.phoneCode);
      } else if (formData.phone.startsWith('+')) {
        // If phone already has a country code, replace it
        const phoneWithoutCode = formData.phone.replace(/^\+\d+/, '');
        handleInputChange('phone', selectedCountry.phoneCode + phoneWithoutCode);
      }
    }
    setShowCountrySelector(false);
  };

  const selectedCountry = COUNTRIES.find(c => c.code === formData.country);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="w-[95vw] sm:w-[92vw] max-w-md h-[90vh] sm:h-[85vh] max-h-[95vh] p-4 sm:p-6 overflow-y-auto rounded-2xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col"
          data-testid="profile-modal"
          aria-describedby="profile-modal-description"
        >
          <DialogHeader className="pt-2 pb-1">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-center text-white">Edit Profile</DialogTitle>
          </DialogHeader>
          
          <div id="profile-modal-description" className="sr-only">
            Edit your profile information including personal details, game accounts, and referral code.
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture Section */}
            <Card className="border-none bg-transparent shadow-none">
              <CardContent className="p-0 space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {profilePicturePreview ? (
                      <img 
                        src={profilePicturePreview} 
                        alt="Profile" 
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-[3px] border-zinc-800 shadow-lg shadow-cyan-500/20"
                      />
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 border-[3px] border-zinc-700 shadow-lg flex items-center justify-center">
                        <i className="fas fa-user text-zinc-400 text-2xl sm:text-3xl"></i>
                      </div>
                    )}
                    {profilePicturePreview && (
                      <button
                        type="button"
                        onClick={removeProfilePicture}
                        className="absolute -top-2 -right-2 w-8 h-8 flex items-center justify-center bg-zinc-800 text-red-400 rounded-full shadow-lg border border-zinc-700 hover:bg-zinc-700 transition-colors"
                        aria-label="Remove profile picture"
                      >
                        <i className="fas fa-times text-xs"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      type="button" 
                      onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30); triggerFileInput(); }}
                      className="bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 h-9 px-4 text-xs sm:text-sm rounded-full"
                    >
                      <i className="fas fa-camera mr-2"></i>
                      Change Picture
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePictureChange}
                      className="hidden"
                    />
                    {profilePicturePreview && (
                      <Button 
                        type="button" 
                        onClick={removeProfilePicture}
                        variant="outline"
                      >
                        <i className="fas fa-trash mr-2"></i>
                        Remove
                      </Button>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 text-center">
                    JPG, PNG, or GIF. Max size: 2MB
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">Personal Information</h3>
              <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Pi Username</Label>
                      <Input 
                        value={user?.username || ''} 
                        readOnly 
                        className="bg-muted cursor-not-allowed"
                        data-testid="pi-username"
                      />
                    </div>
                    {(user?.walletAddress || completedTransactions > 0) && (
                      <div>
                        <Label>Pi Wallet Address</Label>
                        <Input 
                          value={user?.walletAddress ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}` : 'Not set'} 
                          readOnly 
                          className="bg-muted cursor-not-allowed font-mono text-sm"
                          data-testid="pi-wallet"
                        />
                      </div>
                    )}
                    <div>
                      <Label htmlFor="email-input">Email *</Label>
                      <Input
                        id="email-input"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your-email@gmail.com"
                        data-testid="input-email"
                        className="text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country-selector">Country *</Label>
                      <Button
                        id="country-selector"
                        type="button"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setShowCountrySelector(true)}
                        data-testid="country-selector-button"
                      >
                        {selectedCountry?.flag} {selectedCountry?.name}
                      </Button>
                    </div>
                    <div>
                      <Label htmlFor="phone-input">Contact Number *</Label>
                      <Input
                        id="phone-input"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        onInput={(e) => {
                          const target = e.target as HTMLInputElement;
                          target.value = target.value.replace(/[^0-9+]/g, '');
                        }}
                        placeholder="+97517875099"
                        data-testid="input-phone"
                        className="text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="language-select-label">Language</Label>
                      <Select value={formData.language} onValueChange={(value) => handleInputChange('language', value)}>
                        <SelectTrigger id="language-select-label" data-testid="language-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang.code} value={lang.code}>
                              {lang.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                </div>
              </div>
            </div>

            {/* Game Selection */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">Games You Play</h3>
              <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="pubg-checkbox"
                      checked={formData.gamesPlayed.pubg}
                      onCheckedChange={(checked) => handleGameSelectionChange('pubg', !!checked)}
                      data-testid="pubg-checkbox"
                    />
                    <Label htmlFor="pubg-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.PUBG} alt="PUBG Mobile" className="w-6 h-6 mr-2" />
                      PUBG Mobile
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="mlbb-checkbox"
                      checked={formData.gamesPlayed.mlbb}
                      onCheckedChange={(checked) => handleGameSelectionChange('mlbb', !!checked)}
                      data-testid="mlbb-checkbox"
                    />
                    <Label htmlFor="mlbb-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.MLBB} alt="Mobile Legends" className="w-6 h-6 mr-2" />
                      Mobile Legends: Bang Bang
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="pubgkr-checkbox"
                      checked={formData.gamesPlayed.pubgkr}
                      onCheckedChange={(checked) => handleGameSelectionChange('pubgkr', !!checked)}
                      data-testid="pubgkr-checkbox"
                    />
                    <Label htmlFor="pubgkr-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.PUBGKR} alt="PUBG Mobile KR" className="w-6 h-6 mr-2" />
                      PUBG Mobile KR
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="coc-checkbox"
                      checked={formData.gamesPlayed.coc}
                      onCheckedChange={(checked) => handleGameSelectionChange('coc', !!checked)}
                      data-testid="coc-checkbox"
                    />
                    <Label htmlFor="coc-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.COC} alt="Clash of Clans" className="w-6 h-6 mr-2" />
                      Clash of Clans
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="robux-checkbox"
                      checked={formData.gamesPlayed.robux}
                      onCheckedChange={(checked) => handleGameSelectionChange('robux', !!checked)}
                      data-testid="robux-checkbox"
                    />
                    <Label htmlFor="robux-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.ROBUX} alt="Roblox" className="w-6 h-6 mr-2" />
                      Roblox
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="newstate-checkbox"
                      checked={formData.gamesPlayed.newstate}
                      onCheckedChange={(checked) => handleGameSelectionChange('newstate', !!checked)}
                      data-testid="newstate-checkbox"
                    />
                    <Label htmlFor="newstate-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.NEWSTATE} alt="NEW STATE" className="w-6 h-6 mr-2" />
                      NEW STATE
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="freefire-checkbox"
                      checked={formData.gamesPlayed.freefire}
                      onCheckedChange={(checked) => handleGameSelectionChange('freefire', !!checked)}
                      data-testid="freefire-checkbox"
                    />
                    <Label htmlFor="freefire-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.FREEFIRE} alt="FREE FIRE" className="w-6 h-6 mr-2" />
                      FREE FIRE
                    </Label>
                  </div>
                  <div className="border-t border-gray-300 my-3"></div>
                  <h4 className="text-sm font-semibold text-purple-700 mb-2">Social Media Services</h4>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="tiktok-checkbox"
                      checked={formData.gamesPlayed.tiktok}
                      onCheckedChange={(checked) => handleGameSelectionChange('tiktok', !!checked)}
                      data-testid="tiktok-checkbox"
                    />
                    <Label htmlFor="tiktok-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.TIKTOK_COINS} alt="TikTok" className="w-6 h-6 mr-2" />
                      TikTok
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="youtube-checkbox"
                      checked={formData.gamesPlayed.youtube}
                      onCheckedChange={(checked) => handleGameSelectionChange('youtube', !!checked)}
                      data-testid="youtube-checkbox"
                    />
                    <Label htmlFor="youtube-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.YOUTUBE_SUBS} alt="YouTube" className="w-6 h-6 mr-2" />
                      YouTube
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="facebook-checkbox"
                      checked={formData.gamesPlayed.facebook}
                      onCheckedChange={(checked) => handleGameSelectionChange('facebook', !!checked)}
                      data-testid="facebook-checkbox"
                    />
                    <Label htmlFor="facebook-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.FACEBOOK} alt="Facebook" className="w-6 h-6 mr-2" />
                      Facebook
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="instagram-checkbox"
                      checked={formData.gamesPlayed.instagram}
                      onCheckedChange={(checked) => handleGameSelectionChange('instagram', !!checked)}
                      data-testid="instagram-checkbox"
                    />
                    <Label htmlFor="instagram-checkbox" className="flex items-center">
                      <img src={GAME_LOGOS.INSTAGRAM} alt="Instagram" className="w-6 h-6 mr-2" />
                      Instagram
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="netflix-checkbox"
                      checked={formData.gamesPlayed.netflix}
                      onCheckedChange={(checked) => handleGameSelectionChange('netflix', !!checked)}
                      data-testid="netflix-checkbox"
                    />
                    <Label htmlFor="netflix-checkbox" className="flex items-center">
                      <i className="fas fa-play text-red-600 text-lg mr-2"></i>
                      Netflix
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <Checkbox
                      id="canva-checkbox"
                      checked={formData.gamesPlayed.canva}
                      onCheckedChange={(checked) => handleGameSelectionChange('canva', !!checked)}
                      data-testid="canva-checkbox"
                    />
                    <Label htmlFor="canva-checkbox" className="flex items-center">
                      <i className="fas fa-palette text-sky-400 text-lg mr-2"></i>
                      Canva
                    </Label>
                  </div>
              </div>
            </div>

            {/* Game Accounts */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">Game Accounts</h3>
              <div className="space-y-6 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                  {/* PUBG Mobile */}
                  {formData.gamesPlayed.pubg && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-purple-200 mb-4" data-testid="pubg-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.PUBG} alt="PUBG Mobile" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">PUBG Mobile</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pubg-ign-input">In-Game Name (IGN)</Label>
                          <Input
                            id="pubg-ign-input"
                            value={formData.gameAccounts.pubg.ign}
                            onChange={(e) => handleGameAccountChange('pubg', 'ign', e.target.value)}
                            placeholder="Enter your IGN"
                            data-testid="pubg-ign"
                            className="text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pubg-uid-input">Player UID</Label>
                          <Input
                            id="pubg-uid-input"
                            value={formData.gameAccounts.pubg.uid}
                            onChange={(e) => handleGameAccountChange('pubg', 'uid', e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.value = target.value.replace(/[^0-9]/g, '');
                            }}
                            placeholder="Enter your Player UID"
                            className="font-mono text-gray-900 bg-white"
                            data-testid="pubg-uid"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PUBG Mobile KR */}
                  {formData.gamesPlayed.pubgkr && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-red-200 mb-4" data-testid="pubgkr-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.PUBGKR} alt="PUBG Mobile KR" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">PUBG Mobile KR</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="pubgkr-ign-input">In-Game Name (IGN)</Label>
                          <Input
                            id="pubgkr-ign-input"
                            value={formData.gameAccounts.pubgkr.ign}
                            onChange={(e) => handleGameAccountChange('pubgkr', 'ign', e.target.value)}
                            placeholder="Enter your IGN"
                            data-testid="pubgkr-ign"
                            className="text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="pubgkr-uid-input">Player UID</Label>
                          <Input
                            id="pubgkr-uid-input"
                            value={formData.gameAccounts.pubgkr.uid}
                            onChange={(e) => handleGameAccountChange('pubgkr', 'uid', e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.value = target.value.replace(/[^0-9]/g, '');
                            }}
                            placeholder="Enter your Player UID"
                            className="font-mono text-gray-900 bg-white"
                            data-testid="pubgkr-uid"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile Legends */}
                  {formData.gamesPlayed.mlbb && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-blue-200 mb-4" data-testid="mlbb-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.MLBB} alt="Mobile Legends" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">Mobile Legends: Bang Bang</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="mlbb-user-id-input">User ID</Label>
                          <Input
                            id="mlbb-user-id-input"
                            value={formData.gameAccounts.mlbb.userId}
                            onChange={(e) => handleGameAccountChange('mlbb', 'userId', e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.value = target.value.replace(/[^0-9]/g, '');
                            }}
                            placeholder="Enter your User ID"
                            className="font-mono text-gray-900 bg-white"
                            data-testid="mlbb-user-id"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </div>
                        <div>
                          <Label htmlFor="mlbb-zone-id-input">Zone ID</Label>
                          <Input
                            id="mlbb-zone-id-input"
                            value={formData.gameAccounts.mlbb.zoneId}
                            onChange={(e) => handleGameAccountChange('mlbb', 'zoneId', e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.value = target.value.replace(/[^0-9]/g, '');
                            }}
                            placeholder="Enter your Zone ID"
                            className="font-mono text-gray-900 bg-white"
                            data-testid="mlbb-zone-id"
                            inputMode="numeric"
                            pattern="[0-9]*"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Clash of Clans */}
                  {formData.gamesPlayed.coc && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-yellow-200 mb-4" data-testid="coc-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.COC} alt="Clash of Clans" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">Clash of Clans</h4>
                      </div>
                      <div>
                        <Label htmlFor="coc-email-input">Email Address</Label>
                        <Input
                          id="coc-email-input"
                          type="email"
                          value={formData.gameAccounts.coc.email}
                          onChange={(e) => handleGameAccountChange('coc', 'email', e.target.value)}
                          placeholder="Enter your Supercell account email"
                          data-testid="coc-email"
                          className="text-gray-900 bg-white"
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          This email must be connected to your Supercell account
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Roblox */}
                  {formData.gamesPlayed.robux && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-blue-200 mb-4" data-testid="robux-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.ROBUX} alt="Roblox" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">Roblox</h4>
                      </div>
                      <div>
                        <Label htmlFor="robux-username-input">Username</Label>
                        <Input
                          id="robux-username-input"
                          value={formData.gameAccounts.robux.username}
                          onChange={(e) => handleGameAccountChange('robux', 'username', e.target.value)}
                          placeholder="Enter your Roblox username"
                          data-testid="robux-username"
                          className="text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* NEW STATE */}
                  {formData.gamesPlayed.newstate && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-orange-200 mb-4" data-testid="newstate-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.NEWSTATE} alt="NEW STATE" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">NEW STATE</h4>
                      </div>
                      <div>
                        <Label htmlFor="newstate-character-id-input">Character ID</Label>
                        <Input
                          id="newstate-character-id-input"
                          value={formData.gameAccounts.newstate.characterId}
                          onChange={(e) => handleGameAccountChange('newstate', 'characterId', e.target.value)}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.value = target.value.replace(/[^0-9]/g, '');
                          }}
                          placeholder="Enter your Character ID"
                          className="font-mono text-gray-900 bg-white"
                          data-testid="newstate-character-id"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                  )}

                  {/* FREE FIRE */}
                  {formData.gamesPlayed.freefire && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-red-200 mb-4" data-testid="freefire-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.FREEFIRE} alt="FREE FIRE" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">FREE FIRE</h4>
                      </div>
                      <div>
                        <Label htmlFor="freefire-player-id-input">Player ID</Label>
                        <Input
                          id="freefire-player-id-input"
                          value={formData.gameAccounts.freefire.playerId}
                          onChange={(e) => handleGameAccountChange('freefire', 'playerId', e.target.value)}
                          onInput={(e) => {
                            const target = e.target as HTMLInputElement;
                            target.value = target.value.replace(/[^0-9]/g, '');
                          }}
                          placeholder="Enter your Player ID"
                          className="font-mono text-gray-900 bg-white"
                          data-testid="freefire-player-id"
                          inputMode="numeric"
                          pattern="[0-9]*"
                        />
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Social Accounts */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider px-1">Social Accounts</h3>
              <div className="space-y-6 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
                {/* TikTok */}
                  {formData.gamesPlayed.tiktok && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-pink-200 mb-4" data-testid="tiktok-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.TIKTOK_COINS} alt="TikTok" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">TikTok</h4>
                      </div>
                      <div>
                        <Label htmlFor="tiktok-username-input">Username</Label>
                        <Input
                          id="tiktok-username-input"
                          value={formData.socialAccounts.tiktok.username}
                          onChange={(e) => handleSocialAccountChange('tiktok', 'username', e.target.value)}
                          placeholder="@yourusername"
                          data-testid="tiktok-username"
                          className="text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* YouTube */}
                  {formData.gamesPlayed.youtube && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-red-200 mb-4" data-testid="youtube-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.YOUTUBE_SUBS} alt="YouTube" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">YouTube</h4>
                      </div>
                      <div>
                        <Label htmlFor="youtube-channel-url-input">Channel URL or Handle</Label>
                        <Input
                          id="youtube-channel-url-input"
                          value={formData.socialAccounts.youtube.channelUrl}
                          onChange={(e) => handleSocialAccountChange('youtube', 'channelUrl', e.target.value)}
                          placeholder="youtube.com/@yourchannel or @yourchannel"
                          data-testid="youtube-channel-url"
                          className="text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Facebook */}
                  {formData.gamesPlayed.facebook && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-blue-200 mb-4" data-testid="facebook-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.FACEBOOK} alt="Facebook" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">Facebook</h4>
                      </div>
                      <div>
                        <Label htmlFor="facebook-profile-url-input">Profile/Page URL</Label>
                        <Input
                          id="facebook-profile-url-input"
                          value={formData.socialAccounts.facebook.profileUrl}
                          onChange={(e) => handleSocialAccountChange('facebook', 'profileUrl', e.target.value)}
                          placeholder="https://facebook.com/yourprofile"
                          data-testid="facebook-profile-url"
                          className="text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Instagram */}
                  {formData.gamesPlayed.instagram && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-purple-200 mb-4" data-testid="instagram-account">
                      <div className="flex items-center mb-4">
                        <img src={GAME_LOGOS.INSTAGRAM} alt="Instagram" className="w-8 h-8 mr-3" />
                        <h4 className="text-lg font-semibold">Instagram</h4>
                      </div>
                      <div>
                        <Label htmlFor="instagram-username-input">Username</Label>
                        <Input
                          id="instagram-username-input"
                          value={formData.socialAccounts.instagram.username}
                          onChange={(e) => handleSocialAccountChange('instagram', 'username', e.target.value)}
                          placeholder="@yourusername"
                          data-testid="instagram-username"
                          className="text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {/* Netflix */}
                  {formData.gamesPlayed.netflix && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-red-600 mb-4" data-testid="netflix-account">
                      <div className="flex items-center mb-4">
                        <i className="fas fa-play text-red-600 text-2xl mr-3"></i>
                        <h4 className="text-lg font-semibold">Netflix</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="netflix-email-input">Email Address</Label>
                          <Input
                            id="netflix-email-input"
                            value={formData.socialAccounts.netflix.email}
                            onChange={(e) => handleSocialAccountChange('netflix', 'email', e.target.value)}
                            placeholder="Enter your Netflix email"
                            type="email"
                            data-testid="netflix-email"
                            className="text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="netflix-whatsapp-input">WhatsApp Number (Optional)</Label>
                          <Input
                            id="netflix-whatsapp-input"
                            value={formData.socialAccounts.netflix.whatsapp}
                            onChange={(e) => handleSocialAccountChange('netflix', 'whatsapp', e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.value = target.value.replace(/[^0-9+]/g, '');
                            }}
                            placeholder="Enter WhatsApp number"
                            data-testid="netflix-whatsapp"
                            className="text-gray-900 bg-white"
                            inputMode="tel"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Canva */}
                  {formData.gamesPlayed.canva && (
                    <div className="p-4 bg-muted rounded-lg border-2 border-sky-400 mb-4" data-testid="canva-account">
                      <div className="flex items-center mb-4">
                        <i className="fas fa-palette text-sky-400 text-2xl mr-3"></i>
                        <h4 className="text-lg font-semibold">Canva</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="canva-email-input">Email Address</Label>
                          <Input
                            id="canva-email-input"
                            value={formData.socialAccounts.canva.email}
                            onChange={(e) => handleSocialAccountChange('canva', 'email', e.target.value)}
                            placeholder="Enter your Canva email"
                            type="email"
                            data-testid="canva-email"
                            className="text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <Label htmlFor="canva-whatsapp-input">WhatsApp Number (Optional)</Label>
                          <Input
                            id="canva-whatsapp-input"
                            value={formData.socialAccounts.canva.whatsapp}
                            onChange={(e) => handleSocialAccountChange('canva', 'whatsapp', e.target.value)}
                            onInput={(e) => {
                              const target = e.target as HTMLInputElement;
                              target.value = target.value.replace(/[^0-9+]/g, '');
                            }}
                            placeholder="Enter WhatsApp number"
                            data-testid="canva-whatsapp"
                            className="text-gray-900 bg-white"
                            inputMode="tel"
                          />
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {/* Referral Code */}
            <div>
              <Label htmlFor="referral-code-input" className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-red-500">
                Referral Code (Optional)
              </Label>
              <Input
                id="referral-code-input"
                value={formData.referralCode}
                onChange={(e) => handleInputChange('referralCode', e.target.value)}
                placeholder="Enter referral code"
                data-testid="referral-code"
              />
            </div>

            {/* Save Button */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="w-full sm:w-1/3 border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800"
                data-testid="cancel-profile-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full sm:w-2/3 bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20"
                onClick={() => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50); }}
                data-testid="save-profile"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save mr-2"></i>
                    Save Changes
                  </>
                )}
              </Button>
            </div>
            
            {/* Settings & Legal App-like Menu */}
            <div className="mt-8 border-t border-gray-200 dark:border-gray-800 pt-6">
              <h4 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wider">Settings & Support</h4>
              <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-2 border border-gray-100 dark:border-gray-800">
                <button 
                  type="button"
                  onClick={() => { if (navigator.vibrate) navigator.vibrate(50); onClose(); setLocation('/privacy-policy'); }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <i className="fas fa-shield-alt w-6 text-center text-blue-500"></i>
                    <span className="ml-3 font-medium text-sm">Privacy Policy</span>
                  </div>
                  <i className="fas fa-chevron-right text-xs text-gray-400"></i>
                </button>
                <button 
                  type="button"
                  onClick={() => { if (navigator.vibrate) navigator.vibrate(50); onClose(); setLocation('/terms-of-service'); }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <i className="fas fa-file-contract w-6 text-center text-purple-500"></i>
                    <span className="ml-3 font-medium text-sm">Terms of Service</span>
                  </div>
                  <i className="fas fa-chevron-right text-xs text-gray-400"></i>
                </button>
                <button 
                  type="button"
                  onClick={() => { if (navigator.vibrate) navigator.vibrate(50); onClose(); setLocation('/faqs'); }}
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="flex items-center text-gray-700 dark:text-gray-300">
                    <i className="fas fa-question-circle w-6 text-center text-green-500"></i>
                    <span className="ml-3 font-medium text-sm">FAQ & Support</span>
                  </div>
                  <i className="fas fa-chevron-right text-xs text-gray-400"></i>
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Country Selector Modal */}
      <CountrySelector
        isOpen={showCountrySelector}
        onClose={() => setShowCountrySelector(false)}
        onSelect={handleCountrySelect}
        selectedCountry={formData.country}
      />
    </>
  );
}
