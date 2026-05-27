import { useTranslations } from 'next-intl';
import type { ApplicationRow } from './page';

export default function ApplicationsList({ applications }: { applications: ApplicationRow[] }) {
  const t = useTranslations('admin.providers');

  if (applications.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('applicationsEmpty')}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColName')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColEmail')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColPhone')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColCity')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColServices')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColExperience')}</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('appColDate')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {applications.map((app) => (
            <tr key={app.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 font-medium text-foreground">{app.full_name}</td>
              <td className="px-4 py-3 text-foreground">{app.email}</td>
              <td className="px-4 py-3 text-foreground">{app.phone}</td>
              <td className="px-4 py-3 text-foreground">{app.city}</td>
              <td className="max-w-[180px] truncate px-4 py-3 text-foreground">{app.service_types}</td>
              <td className="px-4 py-3 text-foreground">{app.experience_years ?? '—'}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(app.created_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
