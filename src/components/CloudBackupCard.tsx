import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { Cloud, CloudOff, CloudUpload, History, KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getDateLocale } from '@/i18n';
import { NUMBER_LOCALE } from '@/lib/currency';
import {
  CloudBackupError,
  connectCloud,
  disconnectCloud,
  getCloudStatus,
  listCloudBackups,
  localTransactionCount,
  restoreCloudBackup,
  saveCloudKey,
  setCloudEnabled,
  subscribeCloudStatus,
  uploadCloudBackup,
  type CloudBackupItem,
  type CloudBackupMeta,
} from '@/lib/cloud-backup';

export default function CloudBackupCard() {
  const { t, i18n } = useTranslation('settings');
  const dateLocale = getDateLocale(i18n.language);
  const [status, setStatus] = useState(getCloudStatus);
  const [keyInput, setKeyInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<{ key: string; latest: CloudBackupMeta } | null>(null);
  const [history, setHistory] = useState<CloudBackupItem[] | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<CloudBackupItem | null>(null);

  useEffect(() => subscribeCloudStatus(setStatus), []);

  const errorText = (err: unknown) => {
    const code = err instanceof CloudBackupError ? err.code : 'unknown';
    const known = ['offline', 'wrong_key', 'short_key', 'not_found', 'storage_unavailable', 'too_large', 'missing_key'];
    return t(`cloudBackup.errors.${known.includes(code) ? code : 'unknown'}`);
  };

  const formatDate = (iso?: string) => (iso ? new Date(iso).toLocaleString(NUMBER_LOCALE) : '');
  const ago = (iso?: string) => (iso ? formatDistanceToNow(new Date(iso), { addSuffix: true, locale: dateLocale }) : '');

  const handleConnect = async () => {
    setBusy(true);
    try {
      const key = keyInput.trim();
      const { latest } = await connectCloud(key);
      const localSales = await localTransactionCount();
      if (latest && (latest.transactions ?? 0) > 0 && localSales < (latest.transactions ?? 0)) {
        // Hay datos en la nube y este teléfono tiene menos: preguntar antes de sobrescribir.
        saveCloudKey(key, false);
        setPendingChoice({ key, latest });
      } else {
        saveCloudKey(key, true);
        await uploadCloudBackup(true);
        toast.success(t('cloudBackup.toast.connected'));
      }
      setKeyInput('');
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const handleUpload = async () => {
    setBusy(true);
    try {
      await uploadCloudBackup(true);
      toast.success(t('cloudBackup.toast.uploaded'));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const openHistory = async () => {
    setBusy(true);
    try {
      setHistory(await listCloudBackups());
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const doRestore = async (backupKey: string) => {
    setBusy(true);
    try {
      await restoreCloudBackup(backupKey);
      toast.success(t('cloudBackup.toast.restored'));
      setHistory(null);
      setRestoreTarget(null);
      setPendingChoice(null);
    } catch (err) {
      toast.error(err instanceof CloudBackupError ? errorText(err) : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const keepLocal = async () => {
    setBusy(true);
    try {
      setCloudEnabled(true);
      await uploadCloudBackup(true);
      setPendingChoice(null);
      toast.success(t('cloudBackup.toast.connected'));
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const backupLabel = (item: CloudBackupItem) => {
    if (item.key === 'latest') return t('cloudBackup.history.latest');
    if (item.key === 'previous') return t('cloudBackup.history.previous');
    return t('cloudBackup.history.day', { date: item.key });
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              status.enabled ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
            }`}
          >
            {status.enabled ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{t('cloudBackup.title')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {!status.connected && t('cloudBackup.notConnected')}
              {status.connected && status.uploading && t('cloudBackup.uploading')}
              {status.connected && !status.uploading && status.lastUploadAt &&
                t('cloudBackup.lastUpload', { time: ago(status.lastUploadAt) })}
              {status.connected && !status.uploading && !status.lastUploadAt && t('cloudBackup.neverUploaded')}
            </p>
            {status.connected && status.lastError && (
              <p className="text-xs text-destructive mt-1">
                {t(`cloudBackup.errors.${status.lastError}`, { defaultValue: t('cloudBackup.errors.unknown') })}
              </p>
            )}
          </div>
        </div>

        {!status.connected ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t('cloudBackup.keyHelp')}</p>
            <div className="flex gap-2">
              <Input
                type="password"
                autoComplete="current-password"
                placeholder={t('cloudBackup.keyPlaceholder')}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="h-10"
              />
              <Button className="h-10 gap-1" onClick={handleConnect} disabled={busy || keyInput.trim().length < 8}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                {t('cloudBackup.connect')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="text-xs">{t('cloudBackup.autoLabel')}</span>
              <Switch checked={status.enabled} onCheckedChange={(v) => setCloudEnabled(v)} />
            </div>
            <Button variant="outline" className="w-full h-10 text-sm gap-2" onClick={handleUpload} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
              {t('cloudBackup.uploadNow')}
            </Button>
            <Button variant="outline" className="w-full h-10 text-sm gap-2" onClick={openHistory} disabled={busy}>
              <History className="w-4 h-4" /> {t('cloudBackup.restore')}
            </Button>
            <Button variant="ghost" className="w-full h-8 text-xs text-muted-foreground" onClick={disconnectCloud}>
              {t('cloudBackup.disconnect')}
            </Button>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!pendingChoice} onOpenChange={(open) => !open && setPendingChoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cloudBackup.choice.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cloudBackup.choice.description', {
                date: formatDate(pendingChoice?.latest.savedAt),
                count: pendingChoice?.latest.transactions ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={keepLocal} disabled={busy}>
              {t('cloudBackup.choice.keepLocal')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => doRestore('latest')} disabled={busy}>
              {t('cloudBackup.choice.restore')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!history} onOpenChange={(open) => !open && setHistory(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('cloudBackup.history.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {history?.length === 0 && <p className="text-sm text-muted-foreground">{t('cloudBackup.history.empty')}</p>}
            {history?.map((item) => (
              <button
                key={item.key}
                className="w-full text-left rounded-lg border px-3 py-2 hover:bg-muted/50"
                onClick={() => setRestoreTarget(item)}
              >
                <p className="text-sm font-medium">{backupLabel(item)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(item.meta?.savedAt)} · {t('cloudBackup.history.sales', { count: item.meta?.transactions ?? 0 })}
                </p>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!restoreTarget} onOpenChange={(open) => !open && setRestoreTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cloudBackup.confirmRestore.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cloudBackup.confirmRestore.description', { name: restoreTarget ? backupLabel(restoreTarget) : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t('cloudBackup.confirmRestore.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => restoreTarget && doRestore(restoreTarget.key)} disabled={busy}>
              {t('cloudBackup.confirmRestore.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
