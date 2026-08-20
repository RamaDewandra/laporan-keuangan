import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';


/* ============================== HELPERS ============================== */

const uid = () => 'i' + Math.random().toString(36).slice(2, 9);

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function formatTanggalIndo(isoStr) {
  if (!isoStr) return '';
  const [y, m, d] = isoStr.split('-').map(Number);
  if (!y || !m || !d) return '';
  return `${d} ${BULAN[m - 1]} ${y}`;
}

function formatIDR(n) {
  const val = Number(n) || 0;
  const abs = Math.abs(val);
  const formatted = abs.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  if (val < 0) return `(${formatted})`;
  if (val === 0) return '–';
  return formatted;
}

const sum = (items) => (items || []).reduce((a, it) => a + (Number(it.value) || 0), 0);

/* ============================== GENERIC FORM PIECES ============================== */

function TextField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function LineItemGroup({ title, hint, items, onChange }) {
  const update = (id, key, val) => {
    onChange(items.map((it) => (it.id === id ? { ...it, [key]: val } : it)));
  };
  const remove = (id) => onChange(items.filter((it) => it.id !== id));
  const add = () => onChange([...items, { id: uid(), label: '', value: 0 }]);
  const total = sum(items);

  return (
    <div className="section-card">
      <div className="sc-head">
        <h3>{title}</h3>
        <span className="sc-total mono">Rp {formatIDR(total)}</span>
      </div>
      {hint && <p className="sc-hint">{hint}</p>}
      {items.map((it) => (
        <div className="item-row" key={it.id}>
          <input
            className="label-input"
            placeholder="Nama pos, mis. Penjualan Tunai"
            value={it.label}
            onChange={(e) => update(it.id, 'label', e.target.value)}
          />
          <input
            className="value-input mono"
            type="number"
            placeholder="0"
            value={it.value === 0 ? '' : it.value}
            onChange={(e) => update(it.id, 'value', e.target.value === '' ? 0 : Number(e.target.value))}
          />
          <button className="del-btn" onClick={() => remove(it.id)} title="Hapus baris">×</button>
        </div>
      ))}
      <button className="add-item-btn" onClick={add}>+ Tambah item</button>
    </div>
  );
}

function SingleNumberField({ label, value, onChange, suffix }) {
  return (
    <div className="section-card">
      <div className="single-field">
        <label>{label}</label>
        <input
          className="mono"
          type="number"
          value={value === 0 ? '' : value}
          placeholder="0"
          onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        />
      </div>
    </div>
  );
}

/* ============================== REPORT SCHEMAS / DEFAULTS ============================== */

const emptyItems = () => [{ id: uid(), label: '', value: 0 }];

function defaultLabaRugi() {
  return {
    namaPerusahaan: '',
    tanggalDari: '',
    tanggalSampai: '',
    pendapatanOperasional: emptyItems(),
    hpp: emptyItems(),
    biayaOperasional: emptyItems(),
    pendapatanLainnya: emptyItems(),
    biayaLainnya: emptyItems(),
    pajakPersen: 0
  };
}

function defaultNeraca() {
  return {
    namaPerusahaan: '',
    tanggal: '',
    kas: emptyItems(),
    bank: emptyItems(),
    piutang: emptyItems(),
    persediaan: emptyItems(),
    aktivaLancarLainnya: emptyItems(),
    aktivaTetap: emptyItems(),
    liabilitasPendek: emptyItems(),
    liabilitasPanjang: emptyItems(),
    ekuitas: emptyItems()
  };
}

function defaultArusKas() {
  return {
    namaPerusahaan: '',
    tanggalDari: '',
    tanggalSampai: '',
    labaBersih: 0,
    penyesuaian: emptyItems(),
    perubahanModalKerja: emptyItems(),
    investasi: emptyItems(),
    pendanaan: emptyItems(),
    saldoAwalKas: 0
  };
}

/* ============================== CALCULATIONS ============================== */

function calcLabaRugi(d) {
  const totalPendapatanOperasi = sum(d.pendapatanOperasional);
  const totalHPP = sum(d.hpp);
  const labaKotor = totalPendapatanOperasi - totalHPP;
  const totalBiayaOperasional = sum(d.biayaOperasional);
  const pendapatanOperasi = labaKotor - totalBiayaOperasional;
  const totalPendapatanLainnya = sum(d.pendapatanLainnya);
  const totalBiayaLainnya = sum(d.biayaLainnya);
  const totalLainnya = totalPendapatanLainnya - totalBiayaLainnya;
  const labaSebelumPajak = pendapatanOperasi + totalLainnya;
  const bebanPajak = labaSebelumPajak > 0 ? labaSebelumPajak * (Number(d.pajakPersen) || 0) / 100 : 0;
  const labaSetelahPajak = labaSebelumPajak - bebanPajak;
  return { totalPendapatanOperasi, totalHPP, labaKotor, totalBiayaOperasional, pendapatanOperasi, totalPendapatanLainnya, totalBiayaLainnya, totalLainnya, labaSebelumPajak, bebanPajak, labaSetelahPajak };
}

function calcNeraca(d) {
  const jumlahKas = sum(d.kas);
  const jumlahBank = sum(d.bank);
  const jumlahKasBank = jumlahKas + jumlahBank;
  const jumlahPiutang = sum(d.piutang);
  const jumlahPersediaan = sum(d.persediaan);
  const jumlahAktivaLancarLainnya = sum(d.aktivaLancarLainnya);
  const jumlahAktivaLancar = jumlahKasBank + jumlahPiutang + jumlahPersediaan + jumlahAktivaLancarLainnya;
  const jumlahAktivaTetap = sum(d.aktivaTetap);
  const totalAktiva = jumlahAktivaLancar + jumlahAktivaTetap;

  const jumlahLiabilitasPendek = sum(d.liabilitasPendek);
  const jumlahLiabilitasPanjang = sum(d.liabilitasPanjang);
  const totalLiabilitas = jumlahLiabilitasPendek + jumlahLiabilitasPanjang;
  const totalEkuitas = sum(d.ekuitas);
  const totalLiabilitasEkuitas = totalLiabilitas + totalEkuitas;
  const selisih = totalAktiva - totalLiabilitasEkuitas;

  return { jumlahKasBank, jumlahPiutang, jumlahPersediaan, jumlahAktivaLancarLainnya, jumlahAktivaLancar, jumlahAktivaTetap, totalAktiva, jumlahLiabilitasPendek, jumlahLiabilitasPanjang, totalLiabilitas, totalEkuitas, totalLiabilitasEkuitas, selisih };
}

function calcArusKas(d) {
  const totalPenyesuaian = sum(d.penyesuaian);
  const totalPerubahanModalKerja = sum(d.perubahanModalKerja);
  const arusKasOperasi = (Number(d.labaBersih) || 0) + totalPenyesuaian + totalPerubahanModalKerja;
  const arusKasInvestasi = sum(d.investasi);
  const arusKasPendanaan = sum(d.pendanaan);
  const kenaikanPenurunanKas = arusKasOperasi + arusKasInvestasi + arusKasPendanaan;
  const saldoAkhirKas = (Number(d.saldoAwalKas) || 0) + kenaikanPenurunanKas;
  return { totalPenyesuaian, totalPerubahanModalKerja, arusKasOperasi, arusKasInvestasi, arusKasPendanaan, kenaikanPenurunanKas, saldoAkhirKas };
}

/* ============================== FORMS PER REPORT ============================== */

function LabaRugiForm({ data, setData }) {
  const set = (key) => (val) => setData({ ...data, [key]: val });
  return (
    <React.Fragment>
      <div className="field-row">
        <TextField label="Nama Perusahaan" value={data.namaPerusahaan} onChange={set('namaPerusahaan')} placeholder="mis. PT. Sinar Dagang Nusantara" />
      </div>
      <div className="field-row">
        <TextField label="Periode dari" type="date" value={data.tanggalDari} onChange={set('tanggalDari')} />
        <TextField label="Periode sampai" type="date" value={data.tanggalSampai} onChange={set('tanggalSampai')} />
      </div>

      <LineItemGroup title="Pendapatan Operasional" hint="Penjualan, potongan penjualan, diskon (isi angka negatif untuk pengurang)" items={data.pendapatanOperasional} onChange={set('pendapatanOperasional')} />
      <LineItemGroup title="Harga Pokok Penjualan (HPP)" items={data.hpp} onChange={set('hpp')} />
      <LineItemGroup title="Biaya Operasional" hint="Beban umum & administrasi, sewa, ekspedisi, dll" items={data.biayaOperasional} onChange={set('biayaOperasional')} />
      <LineItemGroup title="Pendapatan Lainnya" items={data.pendapatanLainnya} onChange={set('pendapatanLainnya')} />
      <LineItemGroup title="Biaya Lainnya" items={data.biayaLainnya} onChange={set('biayaLainnya')} />
      <SingleNumberField label="Tarif Pajak (%)" value={data.pajakPersen} onChange={set('pajakPersen')} />
    </React.Fragment>
  );
}

function NeracaForm({ data, setData }) {
  const set = (key) => (val) => setData({ ...data, [key]: val });
  return (
    <React.Fragment>
      <div className="field-row">
        <TextField label="Nama Perusahaan" value={data.namaPerusahaan} onChange={set('namaPerusahaan')} placeholder="mis. PT. Sinar Dagang Nusantara" />
      </div>
      <div className="field-row">
        <TextField label="Per Tanggal" type="date" value={data.tanggal} onChange={set('tanggal')} />
      </div>

      <div className="section-title" style={{ margin: '4px 0 8px' }}>Aktiva</div>
      <LineItemGroup title="Kas" hint="Kas IDR, USD, SGD, dst — satu baris per mata uang/kas kecil" items={data.kas} onChange={set('kas')} />
      <LineItemGroup title="Bank" items={data.bank} onChange={set('bank')} />
      <LineItemGroup title="Piutang Dagang" items={data.piutang} onChange={set('piutang')} />
      <LineItemGroup title="Persediaan" items={data.persediaan} onChange={set('persediaan')} />
      <LineItemGroup title="Aktiva Lancar Lainnya" hint="Biaya dibayar dimuka, PPN masukan, dll" items={data.aktivaLancarLainnya} onChange={set('aktivaLancarLainnya')} />
      <LineItemGroup title="Aktiva Tetap" hint="Peralatan, kendaraan (akumulasi penyusutan sebagai angka negatif)" items={data.aktivaTetap} onChange={set('aktivaTetap')} />

      <div className="section-title" style={{ margin: '10px 0 8px' }}>Liabilitas & Ekuitas</div>
      <LineItemGroup title="Liabilitas Jangka Pendek" hint="Utang usaha, PPN keluaran, uang muka pelanggan" items={data.liabilitasPendek} onChange={set('liabilitasPendek')} />
      <LineItemGroup title="Liabilitas Jangka Panjang" items={data.liabilitasPanjang} onChange={set('liabilitasPanjang')} />
      <LineItemGroup title="Ekuitas" hint="Modal usaha, laba ditahan, laba tahun berjalan" items={data.ekuitas} onChange={set('ekuitas')} />
    </React.Fragment>
  );
}

function ArusKasForm({ data, setData }) {
  const set = (key) => (val) => setData({ ...data, [key]: val });
  return (
    <React.Fragment>
      <div className="field-row">
        <TextField label="Nama Perusahaan" value={data.namaPerusahaan} onChange={set('namaPerusahaan')} placeholder="mis. PT. Sinar Dagang Nusantara" />
      </div>
      <div className="field-row">
        <TextField label="Periode dari" type="date" value={data.tanggalDari} onChange={set('tanggalDari')} />
        <TextField label="Periode sampai" type="date" value={data.tanggalSampai} onChange={set('tanggalSampai')} />
      </div>

      <SingleNumberField label="Laba/Rugi Bersih" value={data.labaBersih} onChange={set('labaBersih')} />
      <LineItemGroup title="Penyesuaian" hint="mis. akumulasi penyusutan" items={data.penyesuaian} onChange={set('penyesuaian')} />
      <LineItemGroup title="Kenaikan & Penurunan Modal Kerja" hint="Perubahan piutang, persediaan, utang, dll (positif/negatif sesuai arah kas)" items={data.perubahanModalKerja} onChange={set('perubahanModalKerja')} />
      <LineItemGroup title="Aktivitas Investasi" items={data.investasi} onChange={set('investasi')} />
      <LineItemGroup title="Aktivitas Pendanaan" items={data.pendanaan} onChange={set('pendanaan')} />
      <SingleNumberField label="Saldo Awal Kas" value={data.saldoAwalKas} onChange={set('saldoAwalKas')} />
    </React.Fragment>
  );
}

/* ============================== PREVIEWS PER REPORT ============================== */

function RLine({ label, value, indent, sub, total, grand, neg }) {
  const cls = ['rline', indent && 'indent', sub && 'sub', total && 'total', grand && 'grand', (neg || value < 0) && 'neg'].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      <span className="rlabel">{label}</span>
      <span className="rval">Rp {formatIDR(value)}</span>
    </div>
  );
}

function LabaRugiPreview({ data }) {
  const c = calcLabaRugi(data);
  const periode = data.tanggalDari && data.tanggalSampai
    ? `Periode ${formatTanggalIndo(data.tanggalDari)} – ${formatTanggalIndo(data.tanggalSampai)}`
    : 'Periode belum diisi';
  return (
    <div className="sheet">
      <div className="sheet-head">
        <div className="company serif">{data.namaPerusahaan || 'Nama Perusahaan'}</div>
        <div className="title">Laporan Laba Rugi</div>
        <div className="period">{periode}</div>
        <div className="rule"></div>
      </div>

      <div className="section-title">Pendapatan Operasional</div>
      {data.pendapatanOperasional.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Total Pendapatan Operasi" value={c.totalPendapatanOperasi} sub />

      <div className="section-title">Harga Pokok Penjualan</div>
      {data.hpp.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Total HPP" value={c.totalHPP} sub />

      <RLine label="Laba Kotor" value={c.labaKotor} total />

      <div className="section-title">Biaya Operasional</div>
      {data.biayaOperasional.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent neg />)}
      <RLine label="Total Biaya Operasional" value={c.totalBiayaOperasional} sub neg />

      <RLine label="Pendapatan dari Operasi" value={c.pendapatanOperasi} total />

      <div className="section-title">Pendapatan & Biaya Lainnya</div>
      {data.pendapatanLainnya.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      {data.biayaLainnya.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={-Math.abs(it.value)} indent />)}
      <RLine label="Total Pendapatan & Biaya Lainnya" value={c.totalLainnya} sub />

      <RLine label="Laba/Rugi Sebelum Pajak" value={c.labaSebelumPajak} total />
      {data.pajakPersen > 0 && <RLine label={`Pajak (${data.pajakPersen}%)`} value={-c.bebanPajak} indent neg />}
      <RLine label="Laba/Rugi Setelah Pajak" value={c.labaSetelahPajak} grand />

      <div className={`stamp ${c.labaSetelahPajak >= 0 ? '' : 'bad'}`}>
        <span className="stamp-text">{c.labaSetelahPajak >= 0 ? 'LABA BERSIH' : 'RUGI BERSIH'}</span>
      </div>
    </div>
  );
}

function NeracaPreview({ data }) {
  const c = calcNeraca(data);
  const balanced = Math.abs(c.selisih) < 1;
  return (
    <div className="sheet">
      <div className="sheet-head">
        <div className="company serif">{data.namaPerusahaan || 'Nama Perusahaan'}</div>
        <div className="title">Neraca</div>
        <div className="period">{data.tanggal ? `Per ${formatTanggalIndo(data.tanggal)}` : 'Tanggal belum diisi'}</div>
        <div className="rule"></div>
      </div>

      <div className="section-title">Aktiva Lancar</div>
      {data.kas.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      {data.bank.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Jumlah Kas dan Bank" value={c.jumlahKasBank} sub />
      {data.piutang.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      {data.persediaan.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      {data.aktivaLancarLainnya.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Jumlah Aktiva Lancar" value={c.jumlahAktivaLancar} total />

      <div className="section-title">Aktiva Tetap</div>
      {data.aktivaTetap.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Jumlah Aktiva Tetap" value={c.jumlahAktivaTetap} sub />

      <RLine label="Total Aktiva" value={c.totalAktiva} grand />

      <div className="section-title">Liabilitas</div>
      {data.liabilitasPendek.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Jumlah Liabilitas Jangka Pendek" value={c.jumlahLiabilitasPendek} sub />
      {data.liabilitasPanjang.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Jumlah Liabilitas Jangka Panjang" value={c.jumlahLiabilitasPanjang} sub />
      <RLine label="Total Liabilitas" value={c.totalLiabilitas} total />

      <div className="section-title">Ekuitas</div>
      {data.ekuitas.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Total Ekuitas" value={c.totalEkuitas} sub />

      <RLine label="Total Liabilitas & Ekuitas" value={c.totalLiabilitasEkuitas} grand />

      <div className={`stamp ${balanced ? '' : 'bad'}`}>
        <span className="stamp-text">{balanced ? 'NERACA\nSEIMBANG' : `SELISIH\nRp ${formatIDR(c.selisih)}`}</span>
      </div>
    </div>
  );
}

function ArusKasPreview({ data }) {
  const c = calcArusKas(data);
  const periode = data.tanggalDari && data.tanggalSampai
    ? `Periode ${formatTanggalIndo(data.tanggalDari)} – ${formatTanggalIndo(data.tanggalSampai)}`
    : 'Periode belum diisi';
  return (
    <div className="sheet">
      <div className="sheet-head">
        <div className="company serif">{data.namaPerusahaan || 'Nama Perusahaan'}</div>
        <div className="title">Laporan Arus Kas</div>
        <div className="period">{periode}</div>
        <div className="rule"></div>
      </div>

      <div className="section-title">Aktivitas Operasional</div>
      <RLine label="Laba/Rugi Bersih" value={data.labaBersih} indent />
      {data.penyesuaian.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Total Penyesuaian" value={c.totalPenyesuaian} sub />
      {data.perubahanModalKerja.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Total Perubahan Modal Kerja" value={c.totalPerubahanModalKerja} sub />
      <RLine label="Arus Kas Aktivitas Operasi" value={c.arusKasOperasi} total />

      <div className="section-title">Aktivitas Investasi</div>
      {data.investasi.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Arus Kas Aktivitas Investasi" value={c.arusKasInvestasi} total />

      <div className="section-title">Aktivitas Pendanaan</div>
      {data.pendanaan.filter(i=>i.label).map((it) => <RLine key={it.id} label={it.label} value={it.value} indent />)}
      <RLine label="Arus Kas Aktivitas Pendanaan" value={c.arusKasPendanaan} total />

      <RLine label="Kenaikan / Penurunan Kas" value={c.kenaikanPenurunanKas} sub />
      <RLine label="Saldo Awal Kas" value={data.saldoAwalKas} indent />
      <RLine label="Saldo Akhir Kas" value={c.saldoAkhirKas} grand />

      <div className="stamp neutral">
        <span className="stamp-text">ARUS KAS{'\n'}{c.kenaikanPenurunanKas >= 0 ? 'NAIK' : 'TURUN'}</span>
      </div>
    </div>
  );
}

/* ============================== REPORT TYPE REGISTRY ============================== */

const REPORT_TYPES = {
  labaRugi: { key: 'labaRugi', label: 'Laba Rugi', apiType: 'labaRugi', makeDefault: defaultLabaRugi, Form: LabaRugiForm, Preview: LabaRugiPreview },
  neraca: { key: 'neraca', label: 'Neraca', apiType: 'neraca', makeDefault: defaultNeraca, Form: NeracaForm, Preview: NeracaPreview },
  arusKas: { key: 'arusKas', label: 'Arus Kas', apiType: 'arusKas', makeDefault: defaultArusKas, Form: ArusKasForm, Preview: ArusKasPreview }
};

function periodeStringFor(type, data) {
  if (type === 'neraca') return data.tanggal ? `Per ${formatTanggalIndo(data.tanggal)}` : '';
  if (data.tanggalDari && data.tanggalSampai) return `${formatTanggalIndo(data.tanggalDari)} – ${formatTanggalIndo(data.tanggalSampai)}`;
  return '';
}


/* ============================== API CLIENT ============================== */

const API_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '';

function useApi(apiUrl, token) {
  const call = useCallback(async (method, params = {}, body = {}) => {
    if (!apiUrl) throw new Error('URL Apps Script belum dikonfigurasi di .env.');

    let url = apiUrl;

    if (method === 'GET') {
      const qs = new URLSearchParams({ ...params, token: token || '' }).toString();
      url += (apiUrl.includes('?') ? '&' : '?') + qs;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...body, token: token || '' })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, [apiUrl, token]);

  return {
    ping: () => call('GET', { action: 'ping' }),
    login: (username, password) => call('POST', {}, { action: 'login', username, password }),
    list: (type) => call('GET', { action: 'list', type }),
    get: (type, id) => call('GET', { action: 'get', type, id }),
    save: (payload) => call('POST', {}, { action: 'save', ...payload }),
    remove: (type, id) => call('POST', {}, { action: 'delete', type, id })
  };
}

/* ============================== LOGIN ============================== */

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const api = useApi(API_URL, '');
      const res = await api.login(username.trim(), password);

      if (!res.ok) {
        setError(res.error || 'Username atau password salah.');
        return;
      }

      onLogin(res.data);
    } catch (err) {
      setError('Tidak dapat terhubung ke server. Periksa VITE_APPS_SCRIPT_URL di .env.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <span className="eyebrow">Perusahaan Dagang</span>
          <h1 className="serif">Laporan Keuangan</h1>
          <p>Masuk untuk mengelola laporan keuangan.</p>
        </div>

        <form onSubmit={submit} className="login-form">
          <div className="login-field">
            <label>Username</label>
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              disabled={loading}
            />
          </div>

          <div className="login-field">
            <label>Password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password"
              disabled={loading}
            />
          </div>

          {error && <div className="login-error">{error}</div>}

          <button className="login-submit" type="submit" disabled={loading}>
            {loading ? 'Memverifikasi…' : 'Masuk'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ============================== MAIN APP ============================== */

function App({ session, onLogout }) {
  const [reportKey, setReportKey] = useState('labaRugi');
  const [forms, setForms] = useState({
    labaRugi: defaultLabaRugi(),
    neraca: defaultNeraca(),
    arusKas: defaultArusKas()
  });

  const [currentIds, setCurrentIds] = useState({
    labaRugi: null,
    neraca: null,
    arusKas: null
  });

  const [connStatus, setConnStatus] = useState('idle');
  const [history, setHistory] = useState({ labaRugi: [], neraca: [], arusKas: [] });
  const [saveMsg, setSaveMsg] = useState(null);
  const [saving, setSaving] = useState(false);

  const api = useApi(API_URL, session.token);
  const current = REPORT_TYPES[reportKey];
  const data = forms[reportKey];
  const setData = (nd) => setForms((f) => ({ ...f, [reportKey]: nd }));

  const refreshHistory = useCallback(async (typeKey) => {
    try {
      const res = await api.list(REPORT_TYPES[typeKey].apiType);
      if (res.ok) {
        setHistory((h) => ({ ...h, [typeKey]: res.data || [] }));
      } else if (res.code === 'AUTH_REQUIRED') {
        onLogout();
      }
    } catch (e) {
      setConnStatus('err');
    }
  }, [api, onLogout]);

  const testConnection = useCallback(async () => {
    try {
      const res = await api.ping();
      setConnStatus(res.ok ? 'ok' : 'err');
      return res.ok;
    } catch (e) {
      setConnStatus('err');
      return false;
    }
  }, [api]);

  const refreshAll = useCallback(() => {
    Object.keys(REPORT_TYPES).forEach(refreshHistory);
  }, [refreshHistory]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const ok = await testConnection();
      if (!cancelled && ok) refreshAll();
    })();

    return () => { cancelled = true; };
  }, [testConnection, refreshAll]);

  const handleSave = async () => {
    if (!data.namaPerusahaan) {
      setSaveMsg({ text: 'Isi nama perusahaan dulu.', err: true });
      return;
    }

    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await api.save({
        type: current.apiType,
        id: currentIds[reportKey],
        namaPerusahaan: data.namaPerusahaan,
        periode: periodeStringFor(reportKey, data),
        data
      });

      if (res.ok) {
        setCurrentIds((c) => ({ ...c, [reportKey]: res.data.id }));
        setSaveMsg({ text: 'Tersimpan ke Google Sheet.', err: false });
        refreshHistory(reportKey);
      } else if (res.code === 'AUTH_REQUIRED') {
        onLogout();
      } else {
        setSaveMsg({ text: res.error || 'Gagal menyimpan.', err: true });
      }
    } catch (e) {
      setSaveMsg({ text: 'Tidak bisa terhubung ke Apps Script.', err: true });
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    setForms((f) => ({ ...f, [reportKey]: current.makeDefault() }));
    setCurrentIds((c) => ({ ...c, [reportKey]: null }));
    setSaveMsg(null);
  };

  const handleOpen = async (id) => {
    try {
      const res = await api.get(current.apiType, id);
      if (res.ok) {
        setForms((f) => ({ ...f, [reportKey]: res.data.data }));
        setCurrentIds((c) => ({ ...c, [reportKey]: id }));
        setSaveMsg(null);
      } else if (res.code === 'AUTH_REQUIRED') {
        onLogout();
      }
    } catch (e) {
      setSaveMsg({ text: 'Gagal membuka laporan.', err: true });
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Hapus laporan ini dari Google Sheet?')) return;

    try {
      const res = await api.remove(current.apiType, id);
      if (res.code === 'AUTH_REQUIRED') {
        onLogout();
        return;
      }

      refreshHistory(reportKey);
      if (currentIds[reportKey] === id) handleNew();
    } catch (err) {
      setSaveMsg({ text: 'Gagal menghapus laporan.', err: true });
    }
  };

  const Form = current.Form;
  const Preview = current.Preview;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="eyebrow">Perusahaan Dagang</span>
          <h1>Laporan Keuangan</h1>
        </div>

        <div className="user-box">
          <div className="user-name">{session.name || session.username}</div>
          <div className="user-role">{session.role || 'User'}</div>
          <button className="logout-btn" onClick={onLogout}>Keluar</button>
        </div>

        <div className="nav-group">
          <label className="section-label">Jenis Laporan</label>
          <div className="nav-tabs">
            {Object.values(REPORT_TYPES).map((rt) => (
              <button
                key={rt.key}
                className={`nav-tab ${reportKey === rt.key ? 'active' : ''}`}
                onClick={() => setReportKey(rt.key)}
              >
                <span className="dot"></span>{rt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="nav-group">
          <label className="section-label">Riwayat Tersimpan</label>
          <div className="history-list">
            {(history[reportKey] || []).length === 0 && (
              <div className="empty-hint">Belum ada laporan tersimpan.</div>
            )}

            {(history[reportKey] || []).map((h) => (
              <div className="history-item" key={h.id}>
                <span className="h-name">{h.namaPerusahaan}</span>
                <span className="h-meta">{h.periode || '—'}</span>
                <div className="h-actions">
                  <button className="h-btn" onClick={() => handleOpen(h.id)}>Buka & Edit</button>
                  <button className="h-btn danger" onClick={(e) => handleDelete(h.id, e)}>Hapus</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="conn-box">
          <div className="conn-status">
            <span className={`conn-dot ${connStatus === 'ok' ? 'ok' : connStatus === 'err' ? 'err' : ''}`}></span>
            <span>
              {connStatus === 'ok'
                ? 'Terhubung ke spreadsheet'
                : connStatus === 'err'
                  ? 'Gagal terhubung'
                  : 'Memeriksa koneksi…'}
            </span>
          </div>
          <div className="env-hint">Konfigurasi Apps Script berasal dari <code>.env</code>.</div>
        </div>
      </aside>

      <section className="form-panel">
        <div className="panel-header">
          <span className="kicker">Isi Data</span>
          <h2>{current.label}</h2>
        </div>

        <Form data={data} setData={setData} />

        <div className="actions-bar">
          <button className="btn primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Menyimpan…' : (currentIds[reportKey] ? 'Simpan Perubahan' : 'Simpan Laporan')}
          </button>
          <button className="btn ghost" onClick={handleNew}>Laporan Baru</button>
          <button className="btn" onClick={() => window.print()}>Cetak</button>
        </div>

        {saveMsg && <div className={`save-msg ${saveMsg.err ? 'err' : ''}`}>{saveMsg.text}</div>}
      </section>

      <section className="preview-panel">
        <Preview data={data} />
      </section>
    </div>
  );
}

/* ============================== ROOT ============================== */

function Root() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('lk_session') || 'null');
    } catch {
      return null;
    }
  });

  const login = (data) => {
    localStorage.setItem('lk_session', JSON.stringify(data));
    setSession(data);
  };

  const logout = () => {
    localStorage.removeItem('lk_session');
    setSession(null);
  };

  if (!session?.token) {
    return <LoginPage onLogin={login} />;
  }

  return <App session={session} onLogout={logout} />;
}

export default Root;
