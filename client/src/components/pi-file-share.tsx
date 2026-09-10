import { useRef, useState } from 'react';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { piSDK } from '@/lib/pi-sdk';

export default function PiFileShare() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    setIsSharing(true);
    try {
      await piSDK.shareFile(file);
      toast({
        title: 'File ready to share',
        description: `${file.name} was sent to your device share menu.`,
      });
    } catch (error) {
      toast({
        title: 'Sharing unavailable',
        description: error instanceof Error ? error.message : 'Could not share this file.',
        variant: 'destructive',
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        className="gap-2"
        disabled={isSharing}
        onClick={() => inputRef.current?.click()}
      >
        <FileUp className="h-4 w-4" />
        {isSharing ? 'Opening share menu...' : 'Share a file or video'}
      </Button>
    </>
  );
}