import React, { useState } from 'react';
import {
  Settings,
  ArrowRightLeft,
  Building2,
  Smartphone,
  Save,
  Check,
  Globe,
  Coins,
  Shield,
} from 'lucide-react';

interface SettingsViewProps {
  company: any;
  exchangeRate: number;
  onUpdateExchangeRate: (newRate: number) => Promise<void>;
  isOnline: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  company,
  exchangeRate,
  onUpdateExchangeRate,
  isOnline,
}) => {
  const [rateInput, setRateInput] = useState(exchangeRate.toString());
  const [updatingRate, setUpdatingRate] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(rateInput);
    if (isNaN(parsed) || parsed <= 0) return;

    setUpdatingRate(true);
    setSuccessMsg('');
    try {
      await onUpdateExchangeRate(parsed);
      setSuccessMsg('Taux de change journalier mis à jour avec succès');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error('Rate update error:', err);
    } finally {
      setUpdatingRate(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Paramètres & Configuration Multi-Devises
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Gestion des devises de référence (USD & Franc Congolais), taux de change du jour et passerelle Android
        </p>
      </div>

      {/* Exchange Rate Card */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
            <Coins className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Taux de Change Journalier (CDF / USD)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Définit la parité monétaire utilisée en caisse et sur l'ensemble des factures
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveRate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Taux Franc Congolais (CDF) pour 1.00 USD
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={rateInput}
                  onChange={(e) => setRateInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono font-bold text-base focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                  CDF
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              <div className="text-[11px] font-semibold text-slate-500">Exemple de conversion :</div>
              <div className="mt-1 font-bold text-sm text-slate-900 dark:text-white font-mono">
                $50.00 USD = {(50 * parseFloat(rateInput || '0')).toLocaleString('fr-FR')} CDF
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Calcul en temps réel sur les paniers de caisse
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={updatingRate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{updatingRate ? 'Enregistrement...' : 'Mettre à Jour le Taux du Jour'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Company Profile Details */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
            <Building2 className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Profil de l'Entreprise & Isolation Multi-Tenant
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Paramètres juridiques, fiscaux et identification commerciale
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Raison Sociale Commerciale :</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {company?.name || 'Maison Kivu Grossiste & Distribution'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Nom Légal & Forme Juridique :</span>
            <span className="font-bold text-slate-900 dark:text-white text-sm">
              {company?.legalName || 'Maison Kivu Import-Export SARL'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Numéro d'Identification Fiscale (RCCM) :</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
              {company?.taxNumber || 'CD/KNG/RCCM/24-B-08712'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Pays & Devises Officielles :</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              République Démocratique du Congo (USD & CDF)
            </span>
          </div>
        </div>
      </div>

      {/* Android & SQLite Connection Architecture */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Architecture Passerelle Mobile Android
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Même API centrale, synchronisation SQLite et outbox commune
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
          <p className="text-slate-700 dark:text-slate-300">
            L'application mobile Android PIKISTOCK (React Native / Expo) utilise la même API REST
            centralisée (sur les routes <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">/api/sync/push</code> et <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">/api/sync/pull</code>).
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            Sur Android, la base locale est stockée sous <strong>SQLite</strong> avec les mêmes
            tables miroirs et le même gestionnaire d'idempotence UUID, assurant une parité stricte
            entre le Web et le mobile.
          </p>
        </div>
      </div>
    </div>
  );
};
