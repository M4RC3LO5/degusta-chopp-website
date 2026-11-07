import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { useInstall } from './install';
import InstallGuide from './InstallGuide';

// Botão "Instalar app". Só aparece onde dá para instalar (prompt nativo ou iOS), não instalado e não dispensado.
// `as`: botão (padrão) ou link de texto (rodapé). `className` vem do chamador para casar com o visual de cada lugar.
export default function InstallButton({ appName, className = '', children = 'Instalar app', iconClassName = 'w-4 h-4', labelClassName = '', testId = 'install-app' }) {
  const { mode, promptInstall, dismissInstall } = useInstall();
  const [guide, setGuide] = useState(false);
  if (!mode && !guide) return null;

  const click = () => {
    if (mode === 'prompt') promptInstall();
    else setGuide(true);
  };

  return (
    <>
      {mode && (
        <button type="button" onClick={click} data-testid={testId} className={className} title={typeof children === 'string' ? children : undefined} aria-label={typeof children === 'string' ? children : undefined}>
          <Download className={iconClassName} aria-hidden="true" />
          <span className={labelClassName}>{children}</span>
        </button>
      )}
      {guide && (
        <InstallGuide
          appName={appName}
          onClose={() => setGuide(false)}
          onDismiss={() => { setGuide(false); dismissInstall(); }}
        />
      )}
    </>
  );
}
