'use client';
import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './SearchBar.module.css';

export function SearchBar() {
  const router     = useRouter();
  const params     = useSearchParams();
  const [value, setValue] = useState(params.get('search') || '');
  const [, startTransition] = useTransition();

  function handleSubmit(e) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) {
      next.set('search', value.trim());
    } else {
      next.delete('search');
    }
    next.delete('page');
    startTransition(() => router.push(`/?${next.toString()}`));
  }

  function handleClear() {
    setValue('');
    const next = new URLSearchParams(params.toString());
    next.delete('search');
    router.push(`/?${next.toString()}`);
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <span className={styles.icon}>🔍</span>
      <input
        type="text"
        className={styles.input}
        placeholder="Поиск по проектам..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button type="button" className={styles.clearBtn} onClick={handleClear}>
          ✕
        </button>
      )}
      <button type="submit" className={styles.submitBtn}>Найти</button>
    </form>
  );
}
