import React, { useEffect, useState } from 'react';
import { useTelegram } from '../context/TelegramContext.js';
import {
  Search,
  MessageSquare,
  Users,
  UserCheck,
  Phone,
  RefreshCw,
  Sparkles,
  Award,
} from 'lucide-react';
import { TelegramContact } from '../types/telegram.js';

export const ContactsView: React.FC = () => {
  const {
    contacts,
    loadingContacts,
    fetchContacts,
    selectChat,
  } = useTelegram();

  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = contacts.filter((c) => {
    if (!contactSearch.trim()) return true;
    const q = contactSearch.toLowerCase();
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const username = c.username ? c.username.toLowerCase() : '';
    const phone = c.phone || '';
    return fullName.includes(q) || username.includes(q) || phone.includes(q);
  });

  return (
    <div className="flex-1 h-full overflow-y-auto bg-slate-950/60 p-6 sm:p-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            <span>جهات اتصال تيليجرام ({contacts.length})</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            دليل جهات الاتصال الحقيقية المسترجعة مباشرة من حساب تيليجرام
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchContacts()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingContacts ? 'animate-spin text-sky-400' : ''}`} />
            <span>تحديث جهات الاتصال</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md relative">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={contactSearch}
          onChange={(e) => setContactSearch(e.target.value)}
          placeholder="ابحث بالاسم أو المعرف أو رقم الهاتف..."
          className="w-full pr-10 pl-4 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all shadow-inner text-right"
        />
      </div>

      {/* Grid of Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {loadingContacts && contacts.length === 0 ? (
          <div className="col-span-full p-12 text-center space-y-3 bg-slate-900/40 rounded-3xl border border-slate-800">
            <RefreshCw className="w-6 h-6 animate-spin text-sky-500 mx-auto" />
            <p className="text-xs text-slate-400">جاري تحميل جهات الاتصال من خادم تيليجرام...</p>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="col-span-full p-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-3xl border border-slate-800">
            لم يتم العثور على جهات اتصال تطابق "{contactSearch}".
          </div>
        ) : (
          filteredContacts.map((contact) => {
            const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || contact.username || 'جهة اتصال';
            const initials = fullName.slice(0, 2).toUpperCase();

            return (
              <div
                key={contact.id}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 shadow-md hover:shadow-lg transition-all flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md shadow-sky-600/10">
                    <img
                      src={`/api/telegram/avatar/${contact.id}`}
                      alt={fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <span>{initials}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white truncate">{fullName}</h4>
                      {contact.verified && <Award className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                      {contact.premium && <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />}
                    </div>

                    {contact.username && (
                      <div className="text-[11px] text-sky-400 font-mono truncate" dir="ltr">
                        @{contact.username}
                      </div>
                    )}

                    {contact.phone && (
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                        <Phone className="w-2.5 h-2.5" />
                        <span>{contact.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    {contact.status.replace('UserStatus', '')}
                  </span>

                  <button
                    onClick={() => selectChat(contact.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-semibold shadow-sm transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>مراسلة</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
