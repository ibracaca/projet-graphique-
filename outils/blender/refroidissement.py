# Pièces 03, 04 et 05 : radiateur TRI FROZR 4, Core Pipes, plaque de base.
# Références : vga_body-2.png (radiateur nu), wave.png et air.png (bords en vagues,
# encoches en V, embouts de caloducs), core_pipes.png, copper_baseplate.png.
# Les ailettes sont exportées une fois par variante, avec la liste de leurs
# positions (propriété « instances ») : le site les dessine en une seule fois.
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

from commun import (DIM, aretes_vives, ajouter_lignes, biseauter, boite, cercle, fusionner, lier,
                    lignes, lisser, maillage, materiau, prisme, souder, tour, transformer, vide)

Z = DIM['Z']
R = DIM['RADIATEUR']
PCB = DIM['PCB']
GPU = DIM['GPU']
CP = DIM['CORE_PIPES']


# ---------------------------------------------------------------------------
# Ailettes : une plaque fine (dessinée en simple face, matière double face),
# bord avant ondulé (Wave Curved 4.0) et encoché en V (Air Antegrade Fin 2.0).
def ailette(nom, y0, y1, z0, z1, mat):
    ny = max(2, int((y1 - y0) / 1.45))
    rangs = [z0, z1 - 7, z1 - 3.6, z1 - 1.4, None]  # None : le bord avant
    sommets, faces = [], []
    for j in range(ny + 1):
        y = y0 + (y1 - y0) * j / ny
        # encoche en V tous les 14 mm, 2,5 mm de profondeur
        u = ((y - y0) % 14.0) - 7.0
        encoche = 2.5 * max(0.0, 1.0 - abs(u) / 1.6)
        for z in rangs:
            zz = z1 - encoche if z is None else min(z, z1 - encoche - 0.3)
            # vague : la tôle ondule dans les derniers millimètres avant le bord
            w = max(0.0, min(1.0, (zz - (z1 - 7)) / 7))
            x = 0.42 * math.sin(2 * math.pi * y / 7.5) * w * w * (3 - 2 * w)
            sommets.append((x, y, zz))
    n = len(rangs)
    for j in range(ny):
        for k in range(n - 1):
            a, b = j * n + k, (j + 1) * n + k
            faces.append((a, b, b + 1, a + 1))
    return maillage(nom, sommets, faces, mat, angle=80)


def radiateur():
    m_alu = materiau('aluAilettes', (0.55, 0.55, 0.56), 0.4, 1.0)
    m_nickel = materiau('nickel', (0.7, 0.68, 0.64), 0.22, 1.0)
    racine = vide('radiateur')

    variantes = {}
    fil_s, fil_a = [], []
    for x0, x1 in R['blocs']:
        x = x0
        i = 0
        while x <= x1 + 1e-6:
            courte = i % 2 == 1
            y1 = 49 if -10 < x < 15 else R['yMax']  # encoche du connecteur 16 broches
            z0 = Z['backplateAvant'] - 0.5 if x > PCB['xMax'] else Z['ailettesArriere']
            z1 = Z['ailettesAvant'] - (2.5 if courte else 0)
            variantes.setdefault((y1, z0, z1), []).append(x)
            if i % 2 == 0:
                p = [(x, R['yMin'], z0), (x, y1, z0), (x, y1, z1), (x, R['yMin'], z1)]
                ajouter_lignes(fil_s, fil_a, p, None, ferme=True)
            x += R['pas']
            i += 1
    for k, ((y1, z0, z1), xs) in enumerate(sorted(variantes.items())):
        o = ailette(f'ailettes_{k}', R['yMin'], y1, z0, z1, m_alu)
        o['instances'] = [round(v, 3) for v in xs]
        o.parent = racine

    # Barrettes de maintien sur la face avant.
    barres = []
    for y in (R['yMax'] - 3, 6, R['yMin'] + 3):
        for x0, x1 in R['blocs']:
            b = boite(f'barrette_{y}_{x0}', x0 - 1, x1 + 1, y - 1.5, y + 1.5, Z['ailettesAvant'], Z['ailettesAvant'] + 0.8, m_nickel)
            barres.append(b)
    s, a = aretes_vives(barres, 30)
    ajouter_lignes(fil_s, fil_a, s, a)
    for b in barres:
        biseauter(b, 0.3, 2, 40)
    corps = fusionner(barres, 'radiateur_barrettes')
    lisser(corps, 35)
    corps.parent = racine
    lignes('radiateur__filaire', fil_s, fil_a, racine)
    return racine


# ---------------------------------------------------------------------------
# Core Pipes : section carrée sur la plaque de base, qui devient ronde en la
# quittant, rayons de cintrage d'environ deux diamètres, embout serti.
def catmull_rom(pts, n=24):
    """Courbe de Catmull-Rom centripète (comme CatmullRomCurve3 de Three.js)."""
    p = [Vector(v) for v in pts]
    p = [2 * p[0] - p[1]] + p + [2 * p[-1] - p[-2]]
    sortie = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        t0 = 0.0
        t1 = t0 + max((p1 - p0).length, 1e-4) ** 0.5
        t2 = t1 + max((p2 - p1).length, 1e-4) ** 0.5
        t3 = t2 + max((p3 - p2).length, 1e-4) ** 0.5
        for k in range(n):
            t = t1 + (t2 - t1) * k / n
            a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
            a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
            a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
            b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
            b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
            sortie.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    sortie.append(p[-2])
    return sortie


def reechantillonner(pts, pas):
    longueurs = [0.0]
    for i in range(1, len(pts)):
        longueurs.append(longueurs[-1] + (pts[i] - pts[i - 1]).length)
    total = longueurs[-1]
    n = max(2, int(total / pas))
    sortie, j = [], 0
    for k in range(n + 1):
        s = total * k / n
        while j < len(longueurs) - 2 and longueurs[j + 1] < s:
            j += 1
        t = (s - longueurs[j]) / max(longueurs[j + 1] - longueurs[j], 1e-9)
        sortie.append(pts[j].lerp(pts[j + 1], t))
    return sortie


def section(e, ax, az, m=16):
    """Superellipse : e = 2/n (0,15 : presque carré, 1 : cercle)."""
    pts = []
    for k in range(m):
        t = 2 * math.pi * (k + 0.5) / m
        c, s = math.cos(t), math.sin(t)
        pts.append((ax * math.copysign(abs(c) ** e, c), az * math.copysign(abs(s) ** e, s)))
    return pts


def caloduc(x, y_autre, y_depart, sens, z_niveau, y_niveau, x_fin):
    zc = (Z['plaqueBase'] + Z['corePipes']) / 2
    cles = [(x, y_autre, zc), (x, y_depart - sens * 2, zc), (x, y_depart + sens * 3, zc + 2),
            (x, y_niveau - sens * 2, z_niveau), (x + (10 if sens > 0 else -10), y_niveau, z_niveau), (x_fin, y_niveau, z_niveau)]
    chemin = reechantillonner(catmull_rom(cles, 30), 1.9)
    # repères transportés le long du chemin (pas de vrille) : N part vers +z
    reperes = []
    T = (chemin[1] - chemin[0]).normalized()
    N = Vector((0, 0, 1))
    N = (N - T * N.dot(T)).normalized()
    s_total = 0.0
    s_sortie = None
    for i, p in enumerate(chemin):
        if i:
            s_total += (p - chemin[i - 1]).length
            Tn = ((chemin[min(i + 1, len(chemin) - 1)] - chemin[i - 1])).normalized()
            N = (N - Tn * N.dot(Tn)).normalized()
            T = Tn
        if s_sortie is None and sens * (p.y - y_depart) > 0:
            s_sortie = s_total
        reperes.append((p, T.copy(), N.copy(), T.cross(N).normalized(), s_total))
    sommets, faces = [], []
    m = 16
    for p, T, N, B, s in reperes:
        t = 0.0 if s_sortie is None else max(0.0, min(1.0, (s - s_sortie) / 12.0))
        t = t * t * (3 - 2 * t)
        e = 0.16 + (1 - 0.16) * t
        ax = 3.5 + (3.2 - 3.5) * t
        az = 3.0 + (3.2 - 3.0) * t
        for u, v in section(e, ax, az, m):
            sommets.append(tuple(p + B * u + N * v))
    n = len(reperes)
    for i in range(n - 1):
        for k in range(m):
            k2 = (k + 1) % m
            faces.append((i * m + k, i * m + k2, (i + 1) * m + k2, (i + 1) * m + k))
    # bouchon plat côté plaque
    c0 = len(sommets)
    sommets.append(tuple(reperes[0][0]))
    for k in range(m):
        faces.append((c0, (k + 1) % m, k))
    o = maillage('caloduc', sommets, faces, None, angle=50)
    # embout serti à l'autre bout : épaulement puis dôme (air.png)
    p, T, N, B, _ = reperes[-1]
    profil = [(3.2, 0.0), (3.25, 0.6), (2.7, 1.1), (2.7, 3.6)] + [(2.7 * math.cos(a), 3.6 + 1.6 * math.sin(a)) for a in [i * math.pi / 2 / 5 for i in range(1, 6)]]
    bout = tour('embout', profil, 20, None, ferme=False, angle=50)
    souder(bout)
    rot = Matrix((B, N, T)).transposed().to_4x4()
    transformer(bout, Matrix.Translation(p) @ rot)
    lignes_s = [tuple(rp[0] + rp[3] * 3.3) for rp in reperes[::3]], [tuple(rp[0] - rp[3] * 3.3) for rp in reperes[::3]]
    return fusionner([o, bout], 'caloduc'), lignes_s


def core_pipes():
    m_nickel = materiau('nickel', (0.7, 0.68, 0.64), 0.22, 1.0)
    racine = vide('corePipes')
    n, pas, y = CP['nombre'], CP['pas'], CP['y']
    droite = gauche = 0
    morceaux = []
    fil_s, fil_a = [], []
    for i in range(n):
        x = GPU['x'] + (i - (n - 1) / 2) * pas
        haut = i % 2 == 0
        sens = 1 if haut else -1
        k = droite if haut else gauche
        if haut:
            droite += 1
        else:
            gauche += 1
        z_niveau = -11 + k * 5.5
        y_niveau = 44 + k * 5 if haut else -40 - k * 4.5
        x_fin = 166 if haut else -168
        o, (l1, l2) = caloduc(x, y[0] if haut else y[1], y[1] if haut else y[0], sens, z_niveau, y_niveau, x_fin)
        o.data.materials.append(m_nickel)
        morceaux.append(o)
        ajouter_lignes(fil_s, fil_a, l1, None)
        ajouter_lignes(fil_s, fil_a, l2, None)
    corps = fusionner(morceaux, 'corePipes_corps')
    lisser(corps, 50)
    corps.parent = racine
    lignes('corePipes__filaire', fil_s, fil_a, racine)
    return racine


# ---------------------------------------------------------------------------
# Plaque de base : bloc étagé, plot de contact poli au-dessus du die, pattes
# encochées aux coins, vis à ressort (copper_baseplate.png).
def ressort(nom, x, y, z0, z1, r=2.3, fil=0.32, tours=5, mat=None):
    pts = []
    n = tours * 24
    for i in range(n + 1):
        a = 2 * math.pi * tours * i / n
        pts.append(Vector((x + r * math.cos(a), y + r * math.sin(a), z0 + (z1 - z0) * i / n)))
    sommets, faces = [], []
    m = 8
    for i, p in enumerate(pts):
        T = (pts[min(i + 1, n)] - pts[max(i - 1, 0)]).normalized()
        N = Vector((p.x - x, p.y - y, 0)).normalized()
        B = T.cross(N)
        for k in range(m):
            a = 2 * math.pi * k / m
            sommets.append(tuple(p + N * fil * math.cos(a) + B * fil * math.sin(a)))
    for i in range(n):
        for k in range(m):
            k2 = (k + 1) % m
            faces.append((i * m + k, i * m + k2, (i + 1) * m + k2, (i + 1) * m + k))
    return maillage(nom, sommets, faces, mat, angle=80)


def plaque_base():
    m_nickel = materiau('nickel', (0.7, 0.68, 0.64), 0.22, 1.0)
    m_vis = materiau('visSombre', (0.1, 0.1, 0.11), 0.3, 1.0)
    gx, gy = GPU['x'], GPU['y']
    zd, zp = Z['die'], Z['plaqueBase']
    racine = vide('plaqueBase')
    # contour à pattes : les coins portent les vis, encoches entre elles
    c = [(-39, -34), (-30, -34), (-30, -31), (30, -31), (30, -34), (39, -34), (39, -26), (36, -26), (36, 28),
         (39, 28), (39, 36), (30, 36), (30, 33), (-30, 33), (-30, 36), (-39, 36), (-39, 28), (-36, 28), (-36, -26), (-39, -26)]
    bloc = prisme('plaque', [(gx + x, gy + y) for x, y in c], zd + 1.0, zp, m_nickel)
    plot = boite('plot_die', gx - 15, gx + 15, gy - 17, gy + 17, zd, zd + 1.2, m_nickel)
    epaule = boite('epaule', gx - 27, gx + 27, gy - 22, gy + 24, zp - 0.2, zp + 1.6, m_nickel)
    nets = [bloc, plot, epaule]
    fil_s, fil_a = aretes_vives(nets, 30)
    for o in nets:
        biseauter(o, 0.4, 2, 40)

    vis = []
    for i, (dx, dy) in enumerate(((-34, -29), (34, -29), (-34, 31), (34, 31))):
        x, y = gx + dx, gy + dy
        tete = tour(f'tete_{i}', [(0.0, zp + 4.4), (2.6, zp + 4.4), (2.8, zp + 4.1), (2.8, zp + 3.3), (1.3, zp + 3.3), (1.3, zp), (0.0, zp)], 32, m_vis, angle=40)
        souder(tete)
        transformer(tete, Matrix.Translation((x, y, 0)))
        empreinte = boite('hex', x - 1.0, x + 1.0, y - 0.6, y + 0.6, zp + 3.8, zp + 5)
        from commun import booleen
        booleen(tete, [empreinte])
        vis.append(tete)
        vis.append(ressort(f'ressort_{i}', x, y, zp + 0.1, zp + 3.3, mat=m_vis))
        s, a = cercle(2.8, zp + 4.4, 24, (x, y))
        ajouter_lignes(fil_s, fil_a, s, a)

    corps = fusionner(nets, 'plaqueBase_corps')
    lisser(corps, 35)
    vis_ = fusionner(vis, 'plaqueBase_vis')
    for o in (corps, vis_):
        o.parent = racine
    lignes('plaqueBase__filaire', fil_s, fil_a, racine)
    return racine


def construire():
    radiateur()
    core_pipes()
    plaque_base()
