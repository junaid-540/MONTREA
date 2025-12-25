
import mongoose from 'mongoose';
import User from '../models/userSchema.js';
import { generateReferralCode } from '../utils/referralHelper.js';
import dotenv from 'dotenv';

dotenv.config();

const addReferralCodesToExistingUsers = async () => {
    try {
        console.log('   REFERRAL CODE MIGRATION SCRIPT');
        
        console.log(' Starting migration...');
        console.log(` Date: ${new Date().toLocaleString()}\n`);

        await mongoose.connect(process.env.MONGO_URI);
        console.log(' Connected to MongoDB\n');

        //  Find users without referral codes
        const usersWithoutCodes = await User.find({
            $or: [
                { referralCode: { $exists: false } },
                { referralCode: null },
                { referralCode: '' }
            ]
        });

        console.log(` Found ${usersWithoutCodes.length} users without referral codes\n`);

        // If no users need updating
        if (usersWithoutCodes.length === 0) {
            return;
        }

        //  Process each user
        let successCount = 0;
        let errorCount = 0;

        console.log('  Processing users...\n');

        for (const user of usersWithoutCodes) {
            try {
                // Generate unique referral code
                const referralCode = await generateReferralCode();
                
                // Update user fields
                user.referralCode = referralCode;
                user.referralCount = user.referralCount || 0;
                user.referralEarnings = user.referralEarnings || 0;
                user.referredUsers = user.referredUsers || [];
                
                await user.save();
                
                console.log(` ${successCount + 1}. ${user.email}`);
                console.log(`   Code: ${referralCode}\n`);
                successCount++;
                
            } catch (error) {
                console.error(` Error processing ${user.email}:`);
                console.error(`   ${error.message}\n`);
                errorCount++;
            }
        }

        //  Show summary
        console.log(' MIGRATION SUMMARY');
        console.log(` Successfully updated: ${successCount} users`);
        console.log(` Errors: ${errorCount} users`);
        console.log(` Success rate: ${((successCount / usersWithoutCodes.length) * 100).toFixed(1)}%\n`);
        
        if (successCount > 0) {
            console.log(' Migration completed successfully!\n');
        } else {
            console.log('  Migration completed with errors. Please check logs.\n');
        }

    } catch (error) {
        console.error('  MIGRATION FAILED');
        console.error('Error:', error.message);
        console.error('\nStack trace:', error.stack);
        console.error('\n TIP: Check your MongoDB connection and try again.\n');
    } finally {
        //  Always close the database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
            console.log('🔌 Database connection closed');
        }
        console.log('👋 Script finished. Exiting...\n');
        process.exit(0);
    }
};

// Run the migration
addReferralCodesToExistingUsers();