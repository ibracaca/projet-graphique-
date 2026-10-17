# Pièce 02 : les trois ventilateurs STORMFORCE.
# Références : assets/reference/msi/fan.png, card-f-1.png, kv_vga.png.
# Repère local d'un ventilateur : origine au centre du moyeu, Z vers l'avant,
# z = 0 à la cote VENTILATEURS.zCentre de la carte.
import math

import bmesh

from commun import (DIM, ajouter_lignes, appliquer, biseauter, boite, cercle, cuire_ao,
                    fusionner, lier, lignes, lisser, maillage, materiau, tour, vide)
import bpy

V = DIM['VENTILATEURS']
R_MOYEU = V['rayonMoyeu']  # 16,5
R_ANNEAU = V['rayonAnneau']  # 56,5 : rayon de l'ouverture de la coque
NB_PALES = V['nbPales']

R_PIED = R_MOYEU - 1.0  # le pied de pale est noyé dans le moyeu
R_BOUT = 54.6  # le bout de pale est noyé dans l'anneau
ANNEAU_INT = 54.0
ANNEAU_EXT = 56.2


# ---------------------------------------------------------------------------
# La pale : une aile épaisse. u va du pied au bout, v du bord d'attaque (0) au
# bord de fuite (1). La surface moyenne reprend la forme calée sur les photos
# (ancienne version, src/carte/ventilateurs.js) ; on lui donne une épaisseur.
# ---------------------------------------------------------------------------
def surface_moyenne(a0, u, v):
    r = R_PIED + u * (R_BOUT - R_PIED)
    attaque = a0 + 0.62 * u ** 1.25  # balayage en faucille
    corde = 0.5 + 0.34 * u  # corde angulaire, plus large au bout
    pas = 9 - 3.5 * u  # vrillage : plus inclinée près du moyeu
    a = attaque - v * corde
    z = (v - 0.5) * pas + 1.3 * math.sin(math.pi * v)  # cambrure
    return (r * math.cos(a), r * math.sin(a), z)


def epaisseur(u, x):
    """Épaisseur d'un profil NACA symétrique : bord d'attaque rond, bord de fuite fin."""
    if x <= 0:
        return 0.0
    t = 1.9 - 0.6 * u  # 1,9 mm au pied, 1,3 mm au bout
    yt = 5 * (0.2969 * math.sqrt(x) - 0.1260 * x - 0.3516 * x ** 2 + 0.2843 * x ** 3 - 0.1036 * x ** 4)
    return max(2 * yt * t, 0.3)


def stations():
    """Rayons d'échantillonnage (u) et longueur de corde (fin de v) à chaque station.
    Près du bout, le bord de fuite porte les « griffes » : une rangée de dents
    en escalier (fan.png, bord éclairé en cyan)."""
    st = [(0.80 * i / 28, 1.0) for i in range(28)]
    nb_dents, debut, prof = 5, 0.80, 0.035
    pas = (1.0 - debut) / nb_dents
    for j in range(nb_dents):
        u0 = debut + j * pas
        for k in range(5):
            st.append((u0 + pas * k / 5, 1.0 - prof * k / 5))
        # marche nette : fin de la dent, puis retour à la corde pleine
        st.append((u0 + pas - 0.002, 1.0 - prof))
    st.append((1.0, 1.0 - prof))
    return st


def pale(a0, n_cote=14):
    sommets, faces = [], []
    attaque, fuite = [], []
    st = stations()
    xs = [0.5 * (1 - math.cos(math.pi * k / n_cote)) for k in range(n_cote + 1)]
    n_boucle = 1 + 2 * n_cote
    eps = 1e-3
    for u, fin in st:
        boucle_haut, boucle_bas = [], []
        for x in xs:
            # la surface reste celle de la pale pleine : la dent ne fait que rogner
            # le bord de fuite (les points au-delà se posent sur la nouvelle arête)
            v = min(x, fin)
            p = surface_moyenne(a0, u, v)
            pu = surface_moyenne(a0, min(u + eps, 1), v)
            pu0 = surface_moyenne(a0, max(u - eps, 0), v)
            pv = surface_moyenne(a0, u, min(v + eps, 1))
            pv0 = surface_moyenne(a0, u, max(v - eps, 0))
            du = [pu[i] - pu0[i] for i in range(3)]
            dv = [pv[i] - pv0[i] for i in range(3)]
            n = (du[1] * dv[2] - du[2] * dv[1], du[2] * dv[0] - du[0] * dv[2], du[0] * dv[1] - du[1] * dv[0])
            ln = math.sqrt(sum(c * c for c in n)) or 1
            n = [c / ln for c in n]
            h = epaisseur(u, v) / 2
            boucle_haut.append(tuple(p[i] + n[i] * h for i in range(3)))
            boucle_bas.append(tuple(p[i] - n[i] * h for i in range(3)))
        attaque.append(surface_moyenne(a0, u, 0))
        fuite.append(surface_moyenne(a0, u, fin))
        # boucle : bord d'attaque, dessus jusqu'au bord de fuite, dessous en revenant
        sommets.append(boucle_haut[0])
        sommets.extend(boucle_haut[1:])
        sommets.extend(reversed(boucle_bas[1:]))
    for i in range(len(st) - 1):
        a, b = i * n_boucle, (i + 1) * n_boucle
        for k in range(n_boucle):
            k2 = (k + 1) % n_boucle
            faces.append((a + k, a + k2, b + k2, b + k))
    return sommets, faces, attaque, fuite


def arc(cx, cz, r, a0, a1, n):
    """Points (rayon, z) d'un arc de cercle dans le plan du profil, angles en degrés."""
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)), cz + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]


def profil_anneau():
    """Anneau extérieur : paroi intérieure à deux nervures, lèvre avant roulée."""
    p = [(ANNEAU_INT, -6.1)]
    for zc in (2.6, 4.3):  # nervures fines, elles tracent les filets clairs de fan.png
        p += [(ANNEAU_INT, zc - 0.35), (ANNEAU_INT - 0.22, zc - 0.12), (ANNEAU_INT - 0.22, zc + 0.12), (ANNEAU_INT, zc + 0.35)]
    rl = (ANNEAU_EXT + 0.1 - ANNEAU_INT) / 2
    cx = ANNEAU_INT + rl
    p += arc(cx, 6.9, rl, 180, 0, 14)  # lèvre avant, sommet à z = 6,9 + 1,15
    p += [(ANNEAU_EXT + 0.1, 6.0), (ANNEAU_EXT, -5.6)]
    p += arc(ANNEAU_EXT - 0.5, -5.6, 0.5, 0, -90, 4)
    p += arc(ANNEAU_INT + 0.4, -5.7, 0.4, -90, -180, 4)
    return p


def profil_moyeu():
    """Corps du moyeu (plastique) : flanc droit, congé avant, gorge où se loge le capot."""
    p = [(12.0, -5.0), (R_MOYEU - 0.5, -5.0)]
    p += arc(R_MOYEU - 0.5, -4.5, 0.5, -90, 0, 3)
    p += [(R_MOYEU, 4.4)]
    p += arc(R_MOYEU - 1.4, 4.4, 1.4, 0, 90, 8)
    p += [(14.4, 5.8), (14.4, 5.25), (12.0, 5.25)]
    return p


def profil_capot():
    """Capot du moyeu (métal) : léger dôme, gravure concentrique fine (à la place du
    logo), chanfrein poli sur le pourtour."""
    rc = 13.4
    dome = lambda r: 5.95 + 0.42 * (1 - (r / rc) ** 2)
    p = [(0.0, dome(0))]
    r = 1.5
    while r < rc - 1.2:
        # sillon en V de 0,05 mm : il attrape la lumière en anneaux, comme un métal tourné
        p += [(r, dome(r)), (r + 0.15, dome(r + 0.15) - 0.03), (r + 0.3, dome(r + 0.3))]
        r += 1.3
    p += [(rc, dome(rc)), (rc + 0.75, 5.45), (rc + 0.75, 5.0), (0.0, 5.0)]
    return p


def nettoyer(o, dist=1e-4):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=dist)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(o.data)
    bm.free()


def construire_rotor(mat_pales, mat_capot):
    """Corps tournant (pales + anneau + moyeu, une seule matière) et capot."""
    morceaux = []
    filaire_s, filaire_a = [], []
    for k in range(NB_PALES):
        a0 = 2 * math.pi * k / NB_PALES
        s, f, attaque, fuite = pale(a0)
        o = maillage(f'pale_{k}', s, f, mat_pales, angle=50)
        nettoyer(o)
        lisser(o, 50)
        morceaux.append(o)
        ajouter_lignes(filaire_s, filaire_a, attaque, None)
        ajouter_lignes(filaire_s, filaire_a, fuite, None)
    anneau = tour('anneau', profil_anneau(), 160, mat_pales, angle=30)
    moyeu = tour('moyeu', profil_moyeu(), 96, mat_pales, angle=30)
    for o in (anneau, moyeu):
        nettoyer(o)
        lisser(o, 30)
    morceaux += [anneau, moyeu]
    corps = fusionner(morceaux, 'rotor_corps')
    capot = tour('capot', profil_capot(), 96, mat_capot, angle=60)
    nettoyer(capot)
    lisser(capot, 60)
    capot.name = capot.data.name = 'capot'

    for r, z in ((ANNEAU_EXT + 0.1, 6.0), (ANNEAU_EXT, -5.6), (ANNEAU_INT, 6.9), (R_MOYEU, 4.4), (13.4, 6.0)):
        s, a = cercle(r, z, 96)
        ajouter_lignes(filaire_s, filaire_a, s, a)
    filaire = lignes('rotor_filaire', filaire_s, filaire_a)
    return corps, capot, filaire


def construire_stator(mat):
    """Partie fixe derrière les pales : coupelle du moteur et quatre bras courbes."""
    coupelle = tour('coupelle', [(0.0, -9.2), (12.4, -9.2)] + arc(12.4, -8.6, 0.6, -90, 0, 3) + [(13.0, -6.0)] + arc(12.4, -6.0, 0.6, 0, 90, 3) + [(0.0, -5.4)], 96, mat, angle=30)
    nettoyer(coupelle)
    bras = []
    fil_s, fil_a = [], []
    for k in range(4):
        b = boite(f'bras_{k}', 11.0, 57.0, -1.6, 1.6, -9.0, -7.2, mat, coupes=(24, 1, 1))
        biseauter(b, 0.45, 3, 40)
        ang0 = math.radians(45 + 90 * k)
        for v in b.data.vertices:
            x, y, z = v.co
            a = ang0 + 0.24 * (x - 11.0) / 46.0  # bras balayés, comme des aubes fixes
            v.co = (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a), z)
        bras.append(b)
        ligne = []
        for i in range(17):
            x = 11.0 + 46.0 * i / 16
            a = ang0 + 0.24 * (x - 11.0) / 46.0
            ligne.append((x * math.cos(a), x * math.sin(a), -7.2))
        ajouter_lignes(fil_s, fil_a, ligne, None)
    stator = fusionner([coupelle] + bras, 'stator')
    s, a = cercle(13.0, -6.0, 64)
    ajouter_lignes(fil_s, fil_a, s, a)
    return stator, lignes('stator_filaire', fil_s, fil_a)


def instancier(nom, donnees, parent):
    o = bpy.data.objects.new(nom, donnees)
    return lier(o, parent)


def construire():
    mat_pales = materiau('plastiquePales', (0.012, 0.012, 0.014), 0.38)
    mat_stator = materiau('plastiqueNoir', (0.01, 0.01, 0.012), 0.6)
    mat_sombre = materiau('moyeuSombre', (0.05, 0.05, 0.06), 0.25, 1.0)
    mat_argent = materiau('moyeuArgent', (0.75, 0.75, 0.76), 0.3, 1.0)

    corps, capot, fil_rotor = construire_rotor(mat_pales, mat_sombre)
    stator, fil_stator = construire_stator(mat_stator)
    # Occlusion cuite sur un ventilateur assemblé (les trois partagent ces maillages).
    cuire_ao([corps, capot, stator], distance=8.0)
    donnees = {o.name: o.data for o in (corps, capot, stator, fil_rotor, fil_stator)}
    capot_argent = capot.data.copy()
    capot_argent.name = 'capot_argent'
    capot_argent.materials[0] = mat_argent
    for o in (corps, capot, stator, fil_rotor, fil_stator):
        bpy.data.objects.remove(o, do_unlink=True)

    racine = vide('ventilateurs')
    for i, (x, y) in enumerate(V['centres']):
        v = vide(f'ventilateur_{i}', racine, (x, y, V['zCentre']))
        rotor = vide(f'rotor_{i}', v)
        instancier(f'rotor_{i}_corps', donnees['rotor_corps'], rotor)
        instancier(f'rotor_{i}_capot', capot_argent if i == 1 else donnees['capot'], rotor)
        instancier(f'rotor_{i}__filaire', donnees['rotor_filaire'], rotor)
        instancier(f'stator_{i}', donnees['stator'], v)
        instancier(f'stator_{i}__filaire', donnees['stator_filaire'], v)
    return racine
