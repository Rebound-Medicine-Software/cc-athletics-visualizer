import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload } from 'lucide-react';
import ColorThief from 'colorthief';

interface BrandingData {
  name: string;
  logo_url: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
}

interface BrandingFormProps {
  brandingForm: BrandingData;
  setBrandingForm: (data: BrandingData | ((prev: BrandingData) => BrandingData)) => void;
  onLogoUpload?: (file: File) => void;
  showPreview?: boolean;
}

export const BrandingForm: React.FC<BrandingFormProps> = ({ 
  brandingForm, 
  setBrandingForm, 
  onLogoUpload,
  showPreview = true 
}) => {
  const handleColorChange = (field: string, value: string) => {
    setBrandingForm(prev => ({ ...prev, [field]: value }));
    // Apply color immediately for preview
    const cssVar = field === 'primaryColor' ? '--team-primary' : 
                   field === 'secondaryColor' ? '--team-secondary' : 
                   field === 'accentColor' ? '--team-accent' : '';
    if (cssVar) {
      document.documentElement.style.setProperty(cssVar, value);
    }
  };

  const rgbToHex = (r: number, g: number, b: number) => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  const extractColorsFromImage = (imageElement: HTMLImageElement) => {
    try {
      const colorThief = new ColorThief();
      const palette = colorThief.getPalette(imageElement, 3);
      
      if (palette && palette.length >= 3) {
        const primaryColor = rgbToHex(palette[0][0], palette[0][1], palette[0][2]);
        const secondaryColor = rgbToHex(palette[1][0], palette[1][1], palette[1][2]);
        const accentColor = rgbToHex(palette[2][0], palette[2][1], palette[2][2]);
        
        // Determine font family based on color analysis
        const brightness = (palette[0][0] * 299 + palette[0][1] * 587 + palette[0][2] * 114) / 1000;
        const fontFamily = brightness > 128 ? 'Poppins' : 'Montserrat'; // Light colors get modern font, dark get elegant
        
        setBrandingForm(prev => ({
          ...prev,
          primaryColor,
          secondaryColor,
          accentColor,
          fontFamily
        }));
        
        // Apply colors immediately for preview
        document.documentElement.style.setProperty('--team-primary', primaryColor);
        document.documentElement.style.setProperty('--team-secondary', secondaryColor);
        document.documentElement.style.setProperty('--team-accent', accentColor);
      }
    } catch (error) {
      console.error('Error extracting colors from image:', error);
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create data URL for immediate preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setBrandingForm(prev => ({ ...prev, logo_url: dataUrl }));
        
        // Create image element for color extraction
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          extractColorsFromImage(img);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
      
      // Also call the optional upload handler
      if (onLogoUpload) {
        onLogoUpload(file);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="team-name">Organization Name</Label>
          <Input
            id="team-name"
            value={brandingForm.name}
            onChange={(e) => setBrandingForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Your organization name"
          />
        </div>

        <div>
          <Label htmlFor="logo-upload">Logo</Label>
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleLogoFileChange}
            className="mt-1"
          />
        </div>

        <div className="space-y-3">
          <Label>Brand Colors</Label>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="primary-color" className="text-xs">Primary</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="primary-color"
                  value={brandingForm.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="w-10 h-10 border rounded cursor-pointer"
                />
                <Input
                  value={brandingForm.primaryColor}
                  onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="secondary-color" className="text-xs">Secondary</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="secondary-color"
                  value={brandingForm.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="w-10 h-10 border rounded cursor-pointer"
                />
                <Input
                  value={brandingForm.secondaryColor}
                  onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="accent-color" className="text-xs">Accent</Label>
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  id="accent-color"
                  value={brandingForm.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="w-10 h-10 border rounded cursor-pointer"
                />
                <Input
                  value={brandingForm.accentColor}
                  onChange={(e) => handleColorChange('accentColor', e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="font-family">Font Family</Label>
          <select 
            id="font-family"
            value={brandingForm.fontFamily}
            onChange={(e) => setBrandingForm(prev => ({ ...prev, fontFamily: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Open Sans">Open Sans</option>
            <option value="Lato">Lato</option>
            <option value="Montserrat">Montserrat</option>
            <option value="Poppins">Poppins</option>
          </select>
        </div>
      </div>

      {showPreview && (
        <div className="space-y-4">
          <div>
            <Label>Brand Preview</Label>
            <Card className="p-4 border-2" style={{ borderColor: brandingForm.accentColor }}>
              <div className="flex items-center space-x-3 mb-4">
                {brandingForm.logo_url && (
                  <img 
                    src={brandingForm.logo_url} 
                    alt="Organization Logo" 
                    className="w-10 h-10 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div>
                  <h3 className="font-semibold" style={{ color: brandingForm.primaryColor }}>
                    {brandingForm.name || 'Your Organization Name'}
                  </h3>
                  <p className="text-sm" style={{ color: brandingForm.secondaryColor }}>
                    Professional Performance Center
                  </p>
                </div>
              </div>
              <Button 
                style={{ 
                  backgroundColor: brandingForm.primaryColor,
                  borderColor: brandingForm.primaryColor 
                }}
                className="text-white"
              >
                Example Button
              </Button>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};