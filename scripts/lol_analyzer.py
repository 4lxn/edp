"""
LoL Gameplay Analyzer — Jäger #ALAN (LAN)
Foco: ADC main con asignación forzada a Support, autofill de teammates,
      y pérdidas desde bottom lane que no se pueden controlar.

Uso:
    pip install -r requirements.txt
    export RIOT_API_KEY='RGAPI-xxxx'   # developer.riotgames.com
    python lol_analyzer.py
"""

import os
import sys
import time
import json
import argparse
from dataclasses import dataclass, field
from typing import Optional
import requests
from urllib.parse import quote

# ─── Config ───────────────────────────────────────────────────────────────────

API_KEY      = os.environ.get("RIOT_API_KEY", "")
GAME_NAME    = "Jäger"
TAG_LINE     = "ALAN"
REGION_PLAT  = "la1"          # servidor de partida
REGION_ROUT  = "americas"     # routing para account-v1 y match-v5
MATCH_COUNT  = 30             # cuántas partidas analizar (máx 100 con dev key)
QUEUE_ID     = 420            # 420=SoloQ ranked, 440=Flex, None=todo

HEADERS = {"X-Riot-Token": API_KEY}

# ─── Helpers ──────────────────────────────────────────────────────────────────

def get(url: str, params: dict = {}) -> dict:
    r = requests.get(url, headers=HEADERS, params=params, timeout=15)
    if r.status_code == 429:
        print("  [rate-limit] esperando 12s...")
        time.sleep(12)
        return get(url, params)
    if not r.ok:
        print(f"  [ERROR {r.status_code}] {url}")
        print(f"  {r.text[:300]}")
        sys.exit(1)
    return r.json()

def puuid_from_riot_id(game_name: str, tag: str) -> str:
    name_enc = quote(game_name, safe="")
    tag_enc = quote(tag, safe="")
    url = f"https://{REGION_ROUT}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{name_enc}/{tag_enc}"
    return get(url)["puuid"]

def summoner_from_puuid(puuid: str) -> dict:
    url = f"https://{REGION_PLAT}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
    return get(url)

def match_ids(puuid: str, count: int, queue: Optional[int]) -> list[str]:
    params = {"start": 0, "count": count}
    if queue:
        params["queue"] = queue
    url = f"https://{REGION_ROUT}.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
    return get(url, params)

def match_data(match_id: str) -> dict:
    url = f"https://{REGION_ROUT}.api.riotgames.com/lol/match/v5/matches/{match_id}"
    return get(url)

def match_timeline(match_id: str) -> dict:
    url = f"https://{REGION_ROUT}.api.riotgames.com/lol/match/v5/matches/{match_id}/timeline"
    return get(url)

# ─── Análisis de autofill ──────────────────────────────────────────────────────

# Campeones que típicamente juegan soporte (pool aproximado)
SUPPORT_CHAMPS = {
    "Lulu", "Soraka", "Janna", "Nami", "Thresh", "Blitzcrank", "Leona",
    "Nautilus", "Alistar", "Braum", "Sona", "Karma", "Milio", "Renata Glasc",
    "Yuumi", "Seraphine", "Lux", "Morgana", "Zyra", "Brand", "Vel'Koz",
    "Xerath", "Zilean", "Taric", "Senna", "Bard", "Rakan", "Pyke",
    "Shaco", "Heimerdinger", "Pantheon", "Swain", "Rell", "Poppy",
    "Galio", "Jarvan IV", "Camille", "Amumu", "Ashe"
}

ADC_CHAMPS = {
    "Jinx", "Jhin", "Caitlyn", "Ezreal", "Miss Fortune", "Vayne", "Sivir",
    "Xayah", "Kai'Sa", "Samira", "Draven", "Tristana", "Twitch", "Kog'Maw",
    "Ashe", "Aphelios", "Lucian", "Zeri", "Nilah", "Senna", "Varus",
    "Kalista", "Kindred", "Seraphine", "Swain", "Cassiopeia", "Ziggs",
    "Heimerdinger", "Corki", "Quinn", "Smolder"
}

def is_autofill_support(champ: str, role: str) -> bool:
    """True si alguien juega sup con un campeón que no es de su pool típico."""
    return role in ("SUPPORT", "UTILITY") and champ not in SUPPORT_CHAMPS

def is_autofill_adc(champ: str, role: str) -> bool:
    """True si alguien juega ADC con un campeón off-meta."""
    return role in ("BOTTOM", "CARRY") and champ not in ADC_CHAMPS

# ─── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class LanePhase:
    gold_diff_14: int = 0
    cs_diff_14: int = 0
    xp_diff_14: int = 0
    kills_pre14: int = 0
    deaths_pre14: int = 0

@dataclass
class GameRecord:
    match_id: str
    win: bool
    duration_min: float
    role: str           # BOTTOM / SUPPORT / JUNGLE / etc.
    champ: str
    kda: tuple          # (k, d, a)
    kp_pct: float
    cs_per_min: float
    vision_score: float
    gold_diff_14: int   # vs oponente de carril (del timeline)
    ally_bot_champ: str
    ally_bot_role: str
    ally_bot_autofill: bool
    enemy_bot_stomped: bool   # si el oponente de bot lane ganó su lane fuerte
    biggest_stomped_role: str  # carril aliado más destruido en esa partida

# ─── Parseo de una partida ─────────────────────────────────────────────────────

def parse_match(puuid: str, match_id: str, use_timeline: bool = True) -> Optional[GameRecord]:
    data = match_data(match_id)
    info = data["info"]

    # Encontrar al jugador
    idx = next((i for i, p in enumerate(info["participants"]) if p["puuid"] == puuid), None)
    if idx is None:
        return None

    p = info["participants"][idx]
    duration_min = info["gameDuration"] / 60

    role = p.get("teamPosition", p.get("individualPosition", "UNKNOWN"))
    champ = p["championName"]
    win = p["win"]
    kills, deaths, assists = p["kills"], p["deaths"], p["assists"]
    team_kills = sum(
        x["kills"] for x in info["participants"]
        if x["teamId"] == p["teamId"]
    )
    kp_pct = (kills + assists) / max(team_kills, 1) * 100
    cs = p["totalMinionsKilled"] + p["neutralMinionsKilled"]
    cs_pm = cs / max(duration_min, 1)
    vision = p["visionScore"]

    # Encontrar compañero de bot lane
    ally_bot = next(
        (x for x in info["participants"]
         if x["teamId"] == p["teamId"] and x["puuid"] != puuid
         and x.get("teamPosition") in ("BOTTOM", "UTILITY")),
        None
    )
    ally_champ = ally_bot["championName"] if ally_bot else "?"
    ally_role = ally_bot.get("teamPosition", "?") if ally_bot else "?"
    ally_autofill = is_autofill_support(ally_champ, ally_role) if ally_bot else False
    if role == "UTILITY":
        ally_autofill = is_autofill_adc(ally_champ, ally_role)

    # Carril aliado más destruido (enemigo con mayor gold lead al final)
    team_id = p["teamId"]
    worst_diff = 0
    worst_role = "?"
    for player in info["participants"]:
        if player["teamId"] == team_id:
            continue
        pos = player.get("teamPosition", "UNKNOWN")
        # buscar contraparte aliada
        counterpart = next(
            (a for a in info["participants"]
             if a["teamId"] == team_id and a.get("teamPosition") == pos),
            None
        )
        if counterpart:
            diff = player["goldEarned"] - counterpart["goldEarned"]
            if diff > worst_diff:
                worst_diff = diff
                worst_role = pos

    enemy_bot_stomped = False
    enemy_bot = next(
        (x for x in info["participants"]
         if x["teamId"] != team_id and x.get("teamPosition") == "BOTTOM"),
        None
    )
    if enemy_bot and p.get("teamPosition") == "BOTTOM":
        if enemy_bot["goldEarned"] - p["goldEarned"] > 800:
            enemy_bot_stomped = True

    # Timeline: gold diff @14 vs oponente de carril
    gold_diff = 0
    if use_timeline:
        try:
            tl = match_timeline(match_id)
            time.sleep(0.5)
            # Identificar participantId del jugador (1-indexed)
            part_id = idx + 1
            # Encontrar oponente de carril
            opp_pos = {"BOTTOM": "BOTTOM", "UTILITY": "UTILITY",
                       "TOP": "TOP", "JUNGLE": "JUNGLE", "MIDDLE": "MIDDLE"}.get(role)
            opp_idx = next(
                (i for i, x in enumerate(info["participants"])
                 if x["teamId"] != team_id and x.get("teamPosition") == opp_pos),
                None
            )
            opp_part_id = opp_idx + 1 if opp_idx is not None else None

            frame_14 = tl["info"]["frames"][14] if len(tl["info"]["frames"]) > 14 else None
            if frame_14 and opp_part_id:
                my_gold = frame_14["participantFrames"][str(part_id)]["totalGold"]
                opp_gold = frame_14["participantFrames"][str(opp_part_id)]["totalGold"]
                gold_diff = my_gold - opp_gold
        except Exception as e:
            print(f"  [timeline error] {e}")

    return GameRecord(
        match_id=match_id,
        win=win,
        duration_min=duration_min,
        role=role,
        champ=champ,
        kda=(kills, deaths, assists),
        kp_pct=kp_pct,
        cs_per_min=cs_pm,
        vision_score=vision,
        gold_diff_14=gold_diff,
        ally_bot_champ=ally_champ,
        ally_bot_role=ally_role,
        ally_bot_autofill=ally_autofill,
        enemy_bot_stomped=enemy_bot_stomped,
        biggest_stomped_role=worst_role,
    )

# ─── Reporte ──────────────────────────────────────────────────────────────────

def print_separator(char="─", width=72):
    print(char * width)

def pct(a, b):
    return f"{a/max(b,1)*100:.0f}%"

def avg(lst):
    return sum(lst) / len(lst) if lst else 0

def generate_report(records: list[GameRecord]):
    total = len(records)
    wins = sum(1 for r in records if r.win)

    adc_games   = [r for r in records if r.role in ("BOTTOM", "CARRY")]
    sup_games   = [r for r in records if r.role in ("UTILITY", "SUPPORT")]
    other_games = [r for r in records if r not in adc_games and r not in sup_games]

    print_separator("═")
    print(f"  ANÁLISIS LoL — {GAME_NAME}#{TAG_LINE}  |  {total} partidas")
    print_separator("═")

    # ── 1. Win rate por rol ────────────────────────────────────────────────
    print("\n▸ 1. WIN RATE POR ROL ASIGNADO")
    print_separator()
    for label, group in [("ADC (tu main)", adc_games), ("Support (forzado)", sup_games), ("Otros", other_games)]:
        if not group:
            continue
        w = sum(1 for r in group if r.win)
        print(f"  {label:<25} {w}/{len(group)} partidas  ({pct(w, len(group))} WR)")

    # ── 2. Autofill en bot lane ────────────────────────────────────────────
    print("\n▸ 2. AUTOFILL EN TU BOT LANE")
    print_separator()
    adc_with_autofill_sup = [r for r in adc_games if r.ally_bot_autofill]
    sup_with_autofill_adc = [r for r in sup_games if r.ally_bot_autofill]

    print(f"  Partidas como ADC con sup autofill : {len(adc_with_autofill_sup)}/{len(adc_games)}")
    if adc_with_autofill_sup:
        w = sum(1 for r in adc_with_autofill_sup if r.win)
        print(f"    └─ WR con sup autofill            : {pct(w, len(adc_with_autofill_sup))}")
        w2 = sum(1 for r in adc_games if not r.ally_bot_autofill and r.win)
        n2 = len([r for r in adc_games if not r.ally_bot_autofill])
        print(f"    └─ WR con sup real                : {pct(w2, n2)}")

    print(f"  Partidas como SUP con adc autofill : {len(sup_with_autofill_adc)}/{len(sup_games)}")
    if sup_with_autofill_adc:
        w = sum(1 for r in sup_with_autofill_adc if r.win)
        print(f"    └─ WR con adc autofill            : {pct(w, len(sup_with_autofill_adc))}")

    # ── 3. Lane phase — gold diff @14 ────────────────────────────────────
    print("\n▸ 3. FASE DE LÍNEAS — GOLD DIFF @14 MIN")
    print_separator()
    for label, group in [("ADC", adc_games), ("Support", sup_games)]:
        diffs = [r.gold_diff_14 for r in group if r.gold_diff_14 != 0]
        if not diffs:
            print(f"  {label:<10} — sin datos de timeline")
            continue
        pos = sum(1 for d in diffs if d > 0)
        avg_d = avg(diffs)
        wins_ahead = sum(1 for r in group if r.gold_diff_14 > 0 and r.win)
        total_ahead = sum(1 for r in group if r.gold_diff_14 > 0)
        wins_behind = sum(1 for r in group if r.gold_diff_14 < 0 and r.win)
        total_behind = sum(1 for r in group if r.gold_diff_14 < 0)
        print(f"  {label} — avg gold diff: {avg_d:+.0f}  |  adelante {pos}/{len(diffs)} partidas")
        print(f"    WR cuando vas ADELANTE @14 : {pct(wins_ahead, total_ahead)}")
        print(f"    WR cuando vas ATRÁS   @14  : {pct(wins_behind, total_behind)}")
        if total_ahead > 0 and wins_ahead / total_ahead < 0.55:
            print(f"    ⚠  Tu ventaja de lane NO se convierte en victorias — problema de mid/late game")

    # ── 4. Carril que revienta el juego ───────────────────────────────────
    print("\n▸ 4. ¿QUÉ CARRIL ROMPE LA PARTIDA CUANDO TÚ VAS BIEN?")
    print_separator()
    # Partidas donde tú ibas adelante @14 pero perdiste
    betrayed = [r for r in records if r.gold_diff_14 > 200 and not r.win]
    if betrayed:
        from collections import Counter
        role_counter = Counter(r.biggest_stomped_role for r in betrayed if r.biggest_stomped_role != "?")
        print(f"  Perdiste {len(betrayed)} partidas yendo adelante en lane:")
        for role, count in role_counter.most_common():
            bar = "█" * count
            print(f"    {role:<10} {bar} ({count}x)")
        top = role_counter.most_common(1)
        if top:
            print(f"\n  → El carril más frecuente que te arruina la partida: {top[0][0]}")
    else:
        print("  Sin suficientes datos (necesitas más partidas o no hay cases claros)")

    # ── 5. KP% y visión (traslado de ventaja) ────────────────────────────
    print("\n▸ 5. ¿ESTÁS TRASLADANDO TU VENTAJA?")
    print_separator()
    for label, group in [("ADC", adc_games), ("Support", sup_games)]:
        if not group:
            continue
        kp_list = [r.kp_pct for r in group]
        vs_list = [r.vision_score for r in group]
        cs_list = [r.cs_per_min for r in group]
        print(f"  {label}")
        print(f"    KP% promedio     : {avg(kp_list):.0f}%")
        print(f"    Vision score avg : {avg(vs_list):.1f}")
        print(f"    CS/min avg       : {avg(cs_list):.1f}")
        if label == "ADC" and avg(kp_list) < 50:
            print(f"    ⚠  KP bajo — si ganas lane pero tu KP es <50% probablemente te quedas farmeando")
            print(f"       mientras tu equipo pelea. Prioriza rotar después de push o primer turret.")
        if label == "Support" and avg(vs_list) < 25:
            print(f"    ⚠  Visión baja para sup. Como autofill en sup tu principal valor es warding.")

    # ── 6. Racha de rol forzado ───────────────────────────────────────────
    print("\n▸ 6. PATRÓN DE ROL FORZADO (TILT LOOP)")
    print_separator()
    streak = 0
    max_streak = 0
    sup_streaks = []
    cur = 0
    for r in records:
        if r.role in ("UTILITY", "SUPPORT"):
            cur += 1
            max_streak = max(max_streak, cur)
        else:
            if cur > 1:
                sup_streaks.append(cur)
            cur = 0
    print(f"  Racha más larga de partidas como sup consecutivas : {max_streak}")
    if max_streak >= 3:
        print(f"  ⚠  Riot matchmaking te mandó {max_streak} sups seguidos en algún momento.")
        print(f"     Esto no es alucinación — el sistema de penalización de rol sí existe.")

    # ── 7. Recomendaciones ────────────────────────────────────────────────
    print("\n▸ 7. RECOMENDACIONES PERSONALIZADAS")
    print_separator()

    adc_wr = sum(1 for r in adc_games if r.win) / max(len(adc_games), 1)
    sup_wr = sum(1 for r in sup_games if r.win) / max(len(sup_games), 1)
    betrayed_count = len(betrayed)
    autofill_ratio = len(adc_with_autofill_sup) / max(len(adc_games), 1)

    recs = []

    if sup_wr < 0.40:
        recs.append(
            "SUPPORT POOL MÍNIMO: Aprende 2 supps de impacto alto independiente del ADC:\n"
            "    Thresh (engage + salvar ADC autofill) o Lulu (escudar ADC malo).\n"
            "    No tienes que ser sup main, solo sobrevivir esas partidas con >50% WR."
        )

    if autofill_ratio > 0.35:
        recs.append(
            "SUP AUTOFILL FRECUENTE: En >35% de tus partidas ADC tu sup es autofill.\n"
            "    Estrategia: cambia tu estilo. Juega champs self-sufficient (Vayne, Tristana, Samira)\n"
            "    que no dependen tanto del peel del soporte para hacer daño."
        )

    if betrayed_count >= 3:
        recs.append(
            "VENTAJA NO CONVERTIDA: Ganas tu lane pero igual pierdes. Esto es un problema\n"
            "    de macro post-lane. Después de push de ola y first turret:\n"
            "    → Sube mid y busca profundidad / herald / dragon.\n"
            "    → No te quedes en bot farmeando el vacío mientras el mapa se rompe."
        )

    avg_kp_adc = avg([r.kp_pct for r in adc_games]) if adc_games else 50
    if avg_kp_adc < 48:
        recs.append(
            "KP BAJO COMO ADC: Tu participación en kills es <48% — estás desconectado del juego\n"
            "    después de lane. Activa ping de assist/TP y muévete con tu equipo más agresivo\n"
            "    en ventanas de objetivos (después de dragon, baron, turret)."
        )

    avg_vs_sup = avg([r.vision_score for r in sup_games]) if sup_games else 30
    if avg_vs_sup < 22:
        recs.append(
            "VISION COMO SUP: Tu vision score es bajo. Como autofill en sup, la mejor contribución\n"
            "    que puedes hacer si no sabes el rol es wardear agresivamente y denywarding.\n"
            "    Compra Control Wards siempre (mínimo 2 por partida)."
        )

    if not recs:
        recs.append("Tus números son sólidos — sigue las tendencias de los otros puntos.")

    for i, rec in enumerate(recs, 1):
        print(f"\n  {i}. {rec}")

    print()
    print_separator("═")
    print("  FIN DEL REPORTE")
    print_separator("═")

# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--name",    default=GAME_NAME)
    parser.add_argument("--tag",     default=TAG_LINE)
    parser.add_argument("--region",  default=REGION_PLAT)
    parser.add_argument("--routing", default=REGION_ROUT)
    parser.add_argument("--count",   type=int, default=MATCH_COUNT)
    parser.add_argument("--queue",   type=int, default=QUEUE_ID)
    parser.add_argument("--no-timeline", action="store_true",
                        help="Omitir timeline (más rápido, sin gold diff @14)")
    parser.add_argument("--save-json", action="store_true",
                        help="Guardar resultados en records.json")
    args = parser.parse_args()

    if not API_KEY:
        print("ERROR: falta RIOT_API_KEY. Exporta la variable de entorno.")
        print("  export RIOT_API_KEY='RGAPI-...'")
        sys.exit(1)

    print(f"\nBuscando cuenta {args.name}#{args.tag} en {args.routing}...")
    puuid = puuid_from_riot_id(args.name, args.tag)
    print(f"PUUID: {puuid[:20]}...")

    print(f"\nObteniendo {args.count} partidas (queue={args.queue})...")
    ids = match_ids(puuid, args.count, args.queue)
    print(f"Encontradas {len(ids)} partidas.\n")

    records = []
    for i, mid in enumerate(ids, 1):
        print(f"  [{i}/{len(ids)}] {mid}", end="  ")
        try:
            rec = parse_match(puuid, mid, use_timeline=not args.no_timeline)
            if rec:
                records.append(rec)
                print(f"{rec.role:<10} {rec.champ:<15} {'WIN' if rec.win else 'LOSS'}  gold@14={rec.gold_diff_14:+d}")
            time.sleep(0.8)
        except Exception as e:
            print(f"ERROR: {e}")
            time.sleep(1)

    if args.save_json:
        import dataclasses
        with open("records.json", "w") as f:
            json.dump([dataclasses.asdict(r) for r in records], f, indent=2)
        print("\nGuardado en records.json")

    print()
    generate_report(records)


if __name__ == "__main__":
    main()
