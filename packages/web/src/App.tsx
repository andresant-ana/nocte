import { useState } from "react";

type ProfileId = "DF_SYM_01_3_TO_2" | "DF_SYM_01_1_TO_1";

export function App() {
  const [profile, setProfile] = useState<ProfileId>("DF_SYM_01_3_TO_2");

  return (
    <main className="landing-shell">
      <p className="eyebrow">PROTÓTIPO SOLO · LABORATÓRIO LOCAL</p>
      <h1>NOCTE</h1>
      <p className="subtitle">Duas Faces</p>
      <p className="local-notice">Jogo solo, executado localmente neste navegador.</p>

      <label className="profile-label" htmlFor="rule-profile">
        Perfil experimental
      </label>
      <select
        id="rule-profile"
        aria-label="Perfil experimental de regras"
        value={profile}
        onChange={(event) => setProfile(event.target.value as ProfileId)}
      >
        <option value="DF_SYM_01_3_TO_2">DF-SYM-0.1 · Natural paga 3:2</option>
        <option value="DF_SYM_01_1_TO_1">DF-SYM-0.1 · Natural paga 1:1</option>
      </select>
      <p className="experimental-note">As regras e os dois perfis são experimentais.</p>

      <div className="landing-actions">
        <button type="button">Jogar livre</button>
        <button type="button" className="secondary-action">Iniciar estudo</button>
      </div>
    </main>
  );
}
