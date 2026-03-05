import { initialSchema } from './001_initial_schema';
import { seedAdmin } from './002_seed_admin';
import { fixAdminRole } from './003_fix_admin_role';
import { updateUsersSchema } from './004_update_users_schema';
import { repairFks } from './005_repair_fks';
import { addEmailAndPasswordReset } from './006_add_email_and_password_reset';
import { addNotificationsAndLinkRequests } from './007_add_notifications_and_link_requests';
import { addLanguageSetting } from './008_add_language_setting';
import { addWordlists } from './009_add_wordlists';
import { addPushTokens } from './010_add_push_tokens';
import { addLastSeen } from './011_add_last_seen';
import { addGoogleOauth } from './012_add_google_oauth';

export const migrations = [
    initialSchema,
    seedAdmin,
    fixAdminRole,
    updateUsersSchema,
    repairFks,
    addEmailAndPasswordReset,
    addNotificationsAndLinkRequests,
    addLanguageSetting,
    addWordlists,
    addPushTokens,
    addLastSeen,
    addGoogleOauth,
];
